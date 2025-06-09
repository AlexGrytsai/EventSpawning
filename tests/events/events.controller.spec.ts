import { EventsController } from '../../src/modules/events/controllers/events.controller';
import { LoggerService } from '../../src/common/services/logger.service';
import { MetricsService } from '../../src/modules/metrics/services/metrics.service';
import { register } from 'prom-client';
import { HealthService } from '../../src/modules/health/services/health.service';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: { processEvent: jest.Mock, processEvents: jest.Mock, processEventsBatch: jest.Mock };
  let logger: LoggerService;
  let metrics: MetricsService;
  let healthService: HealthService;
  let correlationIdService: { getId: jest.Mock };
  let eventStorage: { add: jest.Mock };

  beforeEach(() => {
    register.clear();
    eventsService = { processEvent: jest.fn(), processEvents: jest.fn(), processEventsBatch: jest.fn() };
    correlationIdService = { getId: jest.fn().mockReturnValue('test-cid') } as any;
    logger = new LoggerService({ get: jest.fn() } as any, correlationIdService as any);
    metrics = new MetricsService() as any;
    healthService = { isShuttingDownNow: jest.fn().mockReturnValue(false) } as any;
    eventStorage = { add: jest.fn() };
    jest.spyOn(logger, 'logInfo').mockImplementation(jest.fn());
    jest.spyOn(logger, 'logError').mockImplementation(jest.fn());
    jest.spyOn(metrics, 'incrementAccepted').mockImplementation(jest.fn());
    jest.spyOn(metrics, 'incrementFailed').mockImplementation(jest.fn());
    controller = new (require('../../src/modules/events/controllers/events.controller').EventsController)(eventsService as any, logger, metrics, healthService, eventStorage);

    // reset mocks for each test
    eventsService.processEvents.mockReset();
    eventsService.processEvent.mockReset && eventsService.processEvent.mockReset();
    eventStorage.add.mockReset && eventStorage.add.mockReset();
  });

  it('should handle webhook successfully', async () => {
    eventStorage.add.mockResolvedValue(undefined)
    const validEvent = {
      eventId: '1',
      timestamp: new Date().toISOString(),
      source: 'facebook',
      funnelStage: 'top',
      eventType: 'ad.view',
      data: {
        user: {
          userId: 'u1',
          name: 'Test',
          age: 20,
          gender: 'male',
          location: { country: 'RU', city: 'Moscow' },
        },
        engagement: {
          actionTime: new Date().toISOString(),
          referrer: 'newsfeed',
          videoId: null,
        },
      },
    }
    const result = await controller.handleWebhook([validEvent])
    expect(result).toEqual([{ success: true }])
    expect(eventStorage.add).toHaveBeenCalledWith(validEvent)
    expect(metrics.incrementAccepted).toHaveBeenCalledWith(validEvent.source, validEvent.funnelStage, validEvent.eventType)
  })

  it('should handle invalid payload', async () => {
    const invalidEvent = { foo: 'bar' }
    const result = await controller.handleWebhook([invalidEvent])
    expect(result[0].success).toBe(false)
    expect(result[0].error).toBeDefined()
    expect(metrics.incrementFailed).toHaveBeenCalledWith('validation_failed')
  })

  it('should handle storage error', async () => {
    const validEvent = {
      eventId: '2',
      timestamp: new Date().toISOString(),
      source: 'facebook',
      funnelStage: 'top',
      eventType: 'ad.view',
      data: {
        user: {
          userId: 'u2',
          name: 'Test2',
          age: 22,
          gender: 'female',
          location: { country: 'RU', city: 'Moscow' },
        },
        engagement: {
          actionTime: new Date().toISOString(),
          referrer: 'newsfeed',
          videoId: null,
        },
      },
    }
    eventStorage.add.mockRejectedValue(new Error('fail'))
    const result = await controller.handleWebhook([validEvent])
    expect(result).toEqual([{ success: false, error: 'fail' }])
    expect(metrics.incrementFailed).toHaveBeenCalledWith('storage_failed')
    expect(logger.logError).toHaveBeenCalled()
  })

  it('should return 503 if service is shutting down', async () => {
    (healthService.isShuttingDownNow as jest.Mock).mockReturnValue(true);
    await expect(controller.handleWebhook([
      {
        eventId: '1',
        timestamp: '2024-06-08T12:00:00Z',
        source: 'facebook',
        funnelStage: 'top',
        eventType: 'ad.view',
        data: {
          user: {
            userId: 'u1',
            name: 'John Doe',
            age: 30,
            gender: 'male',
            location: { country: 'USA', city: 'NY' }
          },
          engagement: {
            actionTime: '2024-06-08T12:00:00Z',
            referrer: 'newsfeed',
            videoId: null
          }
        }
      }
    ])).rejects.toThrow('Service is shutting down');
    expect(eventsService.processEvents).not.toHaveBeenCalled();
  });

  it('should add valid events and return success statuses', async () => {
    eventStorage.add.mockResolvedValue(undefined);
    const validEvent = {
      eventId: '1',
      timestamp: new Date().toISOString(),
      source: 'facebook',
      funnelStage: 'top',
      eventType: 'ad.view',
      data: {
        user: {
          userId: 'u1',
          name: 'Test',
          age: 20,
          gender: 'male',
          location: { country: 'RU', city: 'Moscow' },
        },
        engagement: {
          actionTime: new Date().toISOString(),
          referrer: 'newsfeed',
          videoId: null,
        },
      },
    };
    eventsService.processEvents.mockResolvedValueOnce([{ success: true }]);
    const result = await controller.handleWebhook([validEvent]);
    expect(result).toEqual([{ success: true }]);
    expect(eventStorage.add).toHaveBeenCalledWith(validEvent);
    expect(metrics.incrementAccepted).toHaveBeenCalled();
  });

  it('should return error status for invalid event', async () => {
    const invalidEvent = { foo: 'bar' };
    await expect(controller.handleWebhook([invalidEvent])).resolves.toEqual([
      { error: expect.anything(), success: false }
    ]);
    expect(metrics.incrementFailed).toHaveBeenCalledWith('validation_failed');
  });

  it('should return error status for storage error', async () => {
    const validEvent = {
      eventId: '2',
      timestamp: new Date().toISOString(),
      source: 'facebook',
      funnelStage: 'top',
      eventType: 'ad.view',
      data: {
        user: {
          userId: 'u2',
          name: 'Test2',
          age: 22,
          gender: 'female',
          location: { country: 'RU', city: 'Moscow' },
        },
        engagement: {
          actionTime: new Date().toISOString(),
          referrer: 'newsfeed',
          videoId: null,
        },
      },
    };
    eventStorage.add.mockRejectedValue(new Error('fail'));
    const result = await controller.handleWebhook([validEvent]);
    expect(result).toEqual([{ success: false, error: 'fail' }]);
    expect(metrics.incrementFailed).toHaveBeenCalledWith('storage_failed');
    expect(logger.logError).toHaveBeenCalled();
  });

  it('should return 503 if service is shutting down', async () => {
    (healthService.isShuttingDownNow as jest.Mock).mockReturnValue(true);
    await expect(controller.handleWebhook([{
      eventId: '1',
      timestamp: new Date().toISOString(),
      source: 'facebook',
      funnelStage: 'top',
      eventType: 'ad.view',
      data: {
        user: {
          userId: 'u1',
          name: 'John Doe',
          age: 30,
          gender: 'male',
          location: { country: 'USA', city: 'NY' }
        },
        engagement: {
          actionTime: new Date().toISOString(),
          referrer: 'newsfeed',
          videoId: null
        }
      }
    }])).rejects.toThrow('Service is shutting down');
    expect(eventStorage.add).not.toHaveBeenCalled();
  });
}); 