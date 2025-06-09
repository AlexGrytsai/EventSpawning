import { Test, TestingModule } from '@nestjs/testing'
import { EventDispatcherService } from '../../src/modules/events/services/event-dispatcher.service'
import { EventStorageService } from '../../src/modules/events/services/event-storage.service'
import { NatsPublisher } from '../../src/modules/nats/services/nats.publisher'
import { LoggerService } from '../../src/common/services/logger.service'
import { MetricsService } from '../../src/modules/metrics/services/metrics.service'
import { ConfigService } from '../../src/common/services/config.service'

describe('EventDispatcherService', () => {
  let service: EventDispatcherService
  let eventStorage: EventStorageService
  let natsPublisher: NatsPublisher
  let logger: LoggerService
  let metrics: MetricsService
  let config: ConfigService

  const event = {
    eventId: '1',
    timestamp: new Date().toISOString(),
    source: 'facebook',
    funnelStage: 'top',
    eventType: 'ad.view',
    data: { user: { userId: 'u', name: 'n', age: 20, gender: 'male', location: { country: 'c', city: 't' } }, engagement: { actionTime: '2024-01-01T00:00:00Z', referrer: 'newsfeed', videoId: null } }
  }

  beforeEach(async () => {
    eventStorage = { getAll: jest.fn().mockResolvedValue([event]), removeById: jest.fn() } as any
    natsPublisher = { publish: jest.fn() } as any
    logger = { logInfo: jest.fn(), logError: jest.fn() } as any
    metrics = { incrementAccepted: jest.fn(), incrementFailed: jest.fn() } as any
    config = { get: jest.fn().mockReturnValue('gateway'), getNumber: jest.fn().mockReturnValue(1) } as any

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventDispatcherService,
        { provide: EventStorageService, useValue: eventStorage },
        { provide: NatsPublisher, useValue: natsPublisher },
        { provide: LoggerService, useValue: logger },
        { provide: MetricsService, useValue: metrics },
        { provide: ConfigService, useValue: config },
      ],
    }).compile()
    service = module.get(EventDispatcherService)
  })

  it('should dispatch and remove event on success', async () => {
    await service['loadEvents']()
    await service['processQueue']()
    expect(natsPublisher.publish).toHaveBeenCalled()
    expect(eventStorage.removeById).toHaveBeenCalledWith('1')
    expect(metrics.incrementAccepted).toHaveBeenCalled()
    expect(logger.logInfo).toHaveBeenCalled()
  })

  it('should retry on failure and not remove event', async () => {
    natsPublisher.publish = jest.fn().mockRejectedValue(new Error('fail'))
    await service['loadEvents']()
    await service['processQueue']()
    expect(natsPublisher.publish).toHaveBeenCalled()
    expect(eventStorage.removeById).not.toHaveBeenCalled()
    expect(metrics.incrementFailed).toHaveBeenCalled()
    expect(logger.logError).toHaveBeenCalled()
  })

  it('should not exceed max attempts', async () => {
    natsPublisher.publish = jest.fn().mockRejectedValue(new Error('fail'))
    config.getNumber = jest.fn().mockImplementation(key => key === 'EVENTS_DISPATCH_MAX_ATTEMPTS' ? 2 : 1)
    await service['loadEvents']()
    for (let i = 0; i < 3; i++) await service['processQueue']()
    expect(service['queue'].length).toBe(0)
  })

  it('should be resilient to invalid events', async () => {
    eventStorage.getAll = jest.fn().mockResolvedValue([{}, event])
    await service['loadEvents']()
    expect(service['queue'].length).toBe(1)
  })
}) 