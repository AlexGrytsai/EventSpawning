import { EventsService } from '../event.service';
import { LoggerService } from '../../../services/logger.service';
import { MetricsService } from '../../metrics/metrics.service';
import { register } from 'prom-client';

describe('EventsService', () => {
  let service: EventsService;
  let natsPublisher: { publish: jest.Mock };
  let metricsService: MetricsService;
  let loggerService: LoggerService;

  beforeEach(() => {
    register.clear();
    natsPublisher = { publish: jest.fn() };
    metricsService = new MetricsService() as any;
    loggerService = new LoggerService({ get: jest.fn() } as any);
    jest.spyOn(metricsService, 'incrementAccepted').mockImplementation(jest.fn());
    jest.spyOn(metricsService, 'incrementFailed').mockImplementation(jest.fn());
    jest.spyOn(metricsService, 'observeProcessingTime').mockImplementation(jest.fn());
    jest.spyOn(loggerService, 'logInfo').mockImplementation(jest.fn());
    jest.spyOn(loggerService, 'logEvent').mockImplementation(jest.fn());
    jest.spyOn(loggerService, 'logError').mockImplementation(jest.fn());
    service = new EventsService(loggerService, natsPublisher as any, metricsService);
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
    const result = await service.processEvent(validPayload);
    expect(natsPublisher.publish).toHaveBeenCalled();
    expect(result.correlationId).toBeDefined();
    expect(loggerService.logEvent).toHaveBeenCalledWith('Event received', expect.objectContaining({ correlationId: result.correlationId }));
  });
}); 