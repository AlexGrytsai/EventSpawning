import { EventsController } from '../../src/modules/events/controllers/events.controller';
import { LoggerService } from '../../src/common/services/logger.service';
import { MetricsService } from '../../src/modules/metrics/services/metrics.service';
import { register } from 'prom-client';
import { HealthService } from '../../src/modules/health/services/health.service';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: { processEvent: jest.Mock, processEvents: jest.Mock };
  let logger: LoggerService;
  let metrics: MetricsService;
  let healthService: HealthService;
  let correlationIdService: { getId: jest.Mock };

  beforeEach(() => {
    register.clear();
    eventsService = { processEvent: jest.fn(), processEvents: jest.fn() };
    correlationIdService = { getId: jest.fn().mockReturnValue('test-cid') } as any;
    logger = new LoggerService({ get: jest.fn() } as any, correlationIdService as any);
    metrics = new MetricsService() as any;
    healthService = { isShuttingDownNow: jest.fn().mockReturnValue(false) } as any;
    jest.spyOn(logger, 'logInfo').mockImplementation(jest.fn());
    jest.spyOn(logger, 'logError').mockImplementation(jest.fn());
    jest.spyOn(metrics, 'incrementAccepted').mockImplementation(jest.fn());
    jest.spyOn(metrics, 'incrementFailed').mockImplementation(jest.fn());
    controller = new EventsController(eventsService as any, logger, metrics, healthService);
  });

  it('should handle webhook successfully', async () => {
    eventsService.processEvents.mockResolvedValueOnce([{ success: true, correlationId: 'corr-1' }]);
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
    ], 'corr-1')).resolves.toEqual([{ success: true, correlationId: 'corr-1' }]);
    expect(eventsService.processEvents).toHaveBeenCalledWith([
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
    ], 'corr-1');
    expect(logger.logInfo).toHaveBeenCalledWith('Webhook batch processed', { correlationId: 'corr-1' });
  });

  it('should generate correlation ID if not provided', async () => {
    eventsService.processEvents.mockResolvedValueOnce([{ success: true, correlationId: 'generated-id' }]);
    const result = await controller.handleWebhook([
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
    ]);
    expect(eventsService.processEvents.mock.calls[0][1]).toBeDefined();
    expect(result).toEqual([{ success: true, correlationId: 'generated-id' }]);
    expect(logger.logInfo).toHaveBeenCalledWith('Webhook batch processed', expect.objectContaining({ correlationId: expect.any(String) }));
  });

  it('should handle invalid payload', async () => {
    eventsService.processEvents.mockRejectedValueOnce({ status: 400, message: 'Validation error', getResponse: () => ({ details: 'details' }) });
    await expect(controller.handleWebhook([])).rejects.toThrow('Validation error');
    expect(logger.logError).toHaveBeenCalled();
  });

  it('should handle business logic error', async () => {
    eventsService.processEvents.mockRejectedValueOnce(new Error('fail'));
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
    ])).rejects.toThrow('Internal server error');
    expect(logger.logError).toHaveBeenCalled();
  });

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
}); 