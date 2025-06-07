import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, Module } from '@nestjs/common'
import * as request from 'supertest'
import { ShutdownService } from '../shutdown.service'
import { HealthService } from '../../health/health.service'
import { PrismaService } from '../prisma.service'
import { NatsPublisher } from '../../modules/nats/nats.publisher'
import { EventsService } from '../../modules/events/event.service'

class MockHealthService {
  setReadiness = jest.fn()
}
class MockPrismaService {
  onModuleDestroy = jest.fn().mockResolvedValue(undefined)
}
class MockNatsPublisher {
  onModuleDestroy = jest.fn().mockResolvedValue(undefined)
}
class MockEventsService {
  awaitAllTasksDone = jest.fn().mockResolvedValue(undefined)
}

@Module({
  providers: [
    ShutdownService,
    { provide: HealthService, useClass: MockHealthService },
    { provide: PrismaService, useClass: MockPrismaService },
    { provide: NatsPublisher, useClass: MockNatsPublisher },
    { provide: EventsService, useClass: MockEventsService },
  ],
  exports: [ShutdownService, HealthService, PrismaService, NatsPublisher, EventsService],
})
class TestShutdownModule {}

describe('Graceful shutdown (integration, minimal module)', () => {
  let app: INestApplication
  let shutdownService: ShutdownService
  let health: MockHealthService
  let prisma: MockPrismaService
  let nats: MockNatsPublisher
  let events: MockEventsService

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TestShutdownModule],
    }).compile()
    app = moduleRef.createNestApplication()
    app.getHttpAdapter().getInstance().get('/test', (req, res) => res.status(200).send('ok'))
    await app.init()
    shutdownService = app.get(ShutdownService)
    health = app.get(HealthService)
    prisma = app.get(PrismaService)
    nats = app.get(NatsPublisher)
    events = app.get(EventsService)
  })

  afterEach(async () => {
    await app.close()
  })

  it('should shutdown gracefully: HTTP server closed, NATS and Prisma connections closed', async () => {
    await request(app.getHttpServer()).get('/test').expect(200)

    await shutdownService.shutdown()
    await app.close()

    await request(app.getHttpServer())
      .get('/test')
      .then(() => {
        throw new Error('Server should be closed')
      })
      .catch(err => {
        expect(err).toBeDefined()
      })

    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(events.awaitAllTasksDone).toHaveBeenCalled()
    expect(prisma.onModuleDestroy).toHaveBeenCalled()
    expect(nats.onModuleDestroy).toHaveBeenCalled()
  })
}) 