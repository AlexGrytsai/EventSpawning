import { EventsService } from '../../src/modules/events/services/event.service';
import { LoggerService } from '../../src/common/services/logger.service';
import { MetricsService } from '../../src/modules/metrics/services/metrics.service';
import { register } from 'prom-client';
import { DeadLetterQueueService } from '../../src/modules/events/services/dead-letter-queue.service'

class MockPrismaClientKnownRequestError extends Error {
  code: string;
  meta: any;
  constructor(message: string, code: string, meta: any) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.code = code;
    this.meta = meta;
  }
}

describe('EventsService', () => {
  let service: EventsService;
  let natsPublisher: { publish: jest.Mock };
  let metricsService: MetricsService;
  let loggerService: LoggerService;
  let prisma: { event: { create: jest.Mock } };
  let correlationIdService: { runWithId: (id: string, fn: any) => any; getId: () => string };
  let dlq: DeadLetterQueueService;
  let eventPersistence: any;

  beforeEach(() => {
    register.clear();
    natsPublisher = { publish: jest.fn() };
    metricsService = new MetricsService() as any;
    correlationIdService = {
      runWithId: (_id: string, fn: any) => fn(),
      getId: jest.fn().mockReturnValue('test-cid'),
    };
    loggerService = new LoggerService({ get: jest.fn() } as any, correlationIdService as any);
    prisma = { event: { create: jest.fn() } };
    dlq = { saveChunk: jest.fn() } as any;
    eventPersistence = { saveEvent: jest.fn(), find: jest.fn() };
    jest.spyOn(metricsService, 'incrementAccepted').mockImplementation(jest.fn());
    jest.spyOn(metricsService, 'incrementFailed').mockImplementation(jest.fn());
    jest.spyOn(metricsService, 'observeProcessingTime').mockImplementation(jest.fn());
    jest.spyOn(loggerService, 'logInfo').mockImplementation(jest.fn());
    jest.spyOn(loggerService, 'logEvent').mockImplementation(jest.fn());
    jest.spyOn(loggerService, 'logError').mockImplementation(jest.fn());
    service = new EventsService(loggerService, natsPublisher as any, metricsService, prisma as any, correlationIdService as any, dlq, eventPersistence);
  });

  it('should process event successfully', async () => {
    natsPublisher.publish.mockResolvedValueOnce({ success: true, correlationId: 'corr-1', subject: 'test', seq: 1 });
    const validTiktokPayload = {
      eventId: '1',
      timestamp: new Date().toISOString(),
      source: 'tiktok',
      funnelStage: 'top',
      eventType: 'video.view',
      data: {
        user: {
          userId: 'u1',
          username: 'test',
          followers: 100
        },
        engagement: {
          watchTime: 10,
          percentageWatched: 100,
          device: 'Android',
          country: 'RU',
          videoId: 'v1'
        }
      }
    };
    await service.processEvent(validTiktokPayload, 'corr-1');
    expect(natsPublisher.publish).toHaveBeenCalled();
    expect(metricsService.incrementAccepted).toHaveBeenCalled();
    expect(loggerService.logEvent).toHaveBeenCalled();
  });

  it('should handle invalid payload', async () => {
    const payload = null;
    await expect(service.processEvent(payload)).rejects.toBeDefined();
    expect(metricsService.incrementFailed).toHaveBeenCalled();
    expect(loggerService.logError).toHaveBeenCalled();
  });

  it('should handle publish error', async () => {
    natsPublisher.publish.mockRejectedValueOnce(new Error('NATS error'));
    const validTiktokPayload = {
      eventId: '1',
      timestamp: new Date().toISOString(),
      source: 'tiktok',
      funnelStage: 'top',
      eventType: 'video.view',
      data: {
        user: {
          userId: 'u1',
          username: 'test',
          followers: 100
        },
        engagement: {
          watchTime: 10,
          percentageWatched: 100,
          device: 'Android',
          country: 'RU',
          videoId: 'v1'
        }
      }
    };
    await expect(service.processEvent(validTiktokPayload)).rejects.toThrow('NATS error');
    expect(metricsService.incrementFailed).toHaveBeenCalled();
    expect(loggerService.logError).toHaveBeenCalled();
  });

  it('should generate correlation ID if not provided', async () => {
    natsPublisher.publish.mockResolvedValueOnce({ success: true, correlationId: 'auto-id', subject: 'test', seq: 1 });
    const validPayload = {
      eventId: '2',
      timestamp: new Date().toISOString(),
      source: 'tiktok',
      funnelStage: 'top',
      eventType: 'video.view',
      data: { user: { userId: 'u2', username: 'test2', followers: 200 }, engagement: { watchTime: 20, percentageWatched: 100, device: 'iOS', country: 'RU', videoId: 'v2' } }
    };
    correlationIdService.getId = jest.fn().mockReturnValue('test-cid');
    const result = await service.processEvent(validPayload);
    expect(natsPublisher.publish).toHaveBeenCalled();
    expect(result.correlationId).toBeDefined();
    expect(loggerService.logEvent).toHaveBeenCalledWith('Event received', expect.objectContaining({ eventType: 'video.view', source: 'tiktok', correlationId: 'test-cid' }));
  });

  it('should return alreadyProcessed: true if eventId already exists', async () => {
    const validPayload = {
      eventId: 'unique-id',
      timestamp: new Date().toISOString(),
      source: 'tiktok',
      funnelStage: 'top',
      eventType: 'video.view',
      data: {
        user: { userId: 'u1', username: 'test', followers: 100 },
        engagement: { watchTime: 10, percentageWatched: 100, device: 'Android', country: 'RU', videoId: 'v1' }
      }
    };
    const error = new MockPrismaClientKnownRequestError('Unique constraint', 'P2002', { target: ['eventId'] });
    eventPersistence.saveEvent = jest.fn().mockRejectedValueOnce(error);
    const result = await service.processEvent(validPayload, 'corr-unique');
    expect(result).toEqual({ success: true, alreadyProcessed: true, correlationId: 'corr-unique' });
    expect(natsPublisher.publish).not.toHaveBeenCalled();
  });
});

describe('EventsService batch processing', () => {
  let service: EventsService
  let prisma: any
  let nats: any
  let dlq: any
  let eventPersistence: any

  beforeEach(() => {
    prisma = { event: { createMany: jest.fn() } }
    nats = { batchPublish: jest.fn() }
    dlq = { saveChunk: jest.fn() }
    eventPersistence = { 
      saveEvent: jest.fn(async (event) => { 
        await prisma.event.createMany(); 
      }),
      find: jest.fn() 
    }
    service = new EventsService(
      { logError: jest.fn(), logEvent: jest.fn(), logInfo: jest.fn() } as any,
      nats,
      {
        incrementFailed: jest.fn(),
        incrementAccepted: jest.fn(),
        observeProcessingTime: jest.fn(),
        incrementBatchConcurrency: jest.fn(),
        decrementBatchConcurrency: jest.fn(),
        observeBatchChunkProcessingTime: jest.fn()
      } as any,
      prisma,
      { getId: jest.fn() } as any,
      dlq,
      eventPersistence
    )
  })

  it('should batch insert and publish events', async () => {
    prisma.event.createMany.mockResolvedValue({})
    nats.batchPublish.mockResolvedValue([{ success: true }])
    const events = [
      { source: 'facebook', eventId: '1', timestamp: new Date().toISOString(), funnelStage: 'top', eventType: 'ad.view', data: { user: { userId: 'u1', name: 'n', age: 1, gender: 'male', location: { country: 'c', city: 'c' } }, engagement: { actionTime: 't', referrer: 'newsfeed', videoId: null } } },
      { source: 'facebook', eventId: '2', timestamp: new Date().toISOString(), funnelStage: 'top', eventType: 'ad.view', data: { user: { userId: 'u2', name: 'n', age: 1, gender: 'male', location: { country: 'c', city: 'c' } }, engagement: { actionTime: 't', referrer: 'newsfeed', videoId: null } } }
    ]
    const res = await service.processEventsBatch(events)
    expect(prisma.event.createMany).toHaveBeenCalled()
    expect(nats.batchPublish).toHaveBeenCalled()
    expect(res.some(r => r.success)).toBeTruthy()
  })

  it('should save chunk to DLQ on error', async () => {
    prisma.event.createMany.mockRejectedValue(new Error('db error'))
    const events = [
      { source: 'facebook', eventId: '1', timestamp: new Date().toISOString(), funnelStage: 'top', eventType: 'ad.view', data: { user: { userId: 'u1', name: 'n', age: 1, gender: 'male', location: { country: 'c', city: 'c' } }, engagement: { actionTime: 't', referrer: 'newsfeed', videoId: null } } }
    ]
    await service.processEventsBatch(events)
    expect(dlq.saveChunk).toHaveBeenCalled()
  })

  it('should return invalid results for invalid events', async () => {
    const events = [
      { invalid: true }
    ]
    const res = await service.processEventsBatch(events)
    expect(res[0].success).toBe(false)
    expect(res[0].error).toBeDefined()
  })
}) 