import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { HealthController } from '../health.controller'
import { HealthService } from '../health.service'
import { ConfigService } from '../../services/config.service'

describe('Health endpoints integration', () => {
  let app: INestApplication
  let healthService: HealthService

  const mockConfigService = {
    get: jest.fn((key: string) => key === 'SERVICE_NAME' ? 'test-service' : undefined)
  }

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            checkLiveness: jest.fn().mockResolvedValue(true),
            checkReadiness: jest.fn().mockResolvedValue({ isReady: true, checks: [] })
          }
        },
        { provide: ConfigService, useValue: mockConfigService }
      ]
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    healthService = moduleRef.get<HealthService>(HealthService)
  })

  afterEach(async () => {
    await app.close()
  })

  it('GET /health/live returns 200 if live', async () => {
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect(res => {
        expect(res.body.status).toBe('ok')
        expect(res.body.service).toBe('test-service')
      })
  })

  it('GET /health/ready returns 200 if ready', async () => {
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect(res => {
        expect(res.body.status).toBe('ok')
        expect(res.body.service).toBe('test-service')
      })
  })

  it('GET /health/ready returns 503 if not ready (shutdown)', async () => {
    jest.spyOn(healthService, 'checkReadiness').mockResolvedValue({ isReady: false, checks: [] })
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(503)
      .expect(res => {
        expect(res.body.status).toBe('error')
        expect(res.body.service).toBe('test-service')
      })
  })
}) 