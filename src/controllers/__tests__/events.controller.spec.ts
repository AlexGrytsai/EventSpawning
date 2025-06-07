import { EventsController } from '../../modules/events/controllers/events.controller';
import { LoggerService } from '../../services/logger.service';
import { MetricsService } from '../../modules/metrics/services/metrics.service';
import { register } from 'prom-client';
import { HealthService } from '../../health/health.service';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: { processEvent: jest.Mock };
  let logger: LoggerService;
  let metrics: MetricsService;
  let healthService: HealthService;
  let correlationIdService: { getId: jest.Mock };

  beforeEach(() => {
    register.clear();
    eventsService = { processEvent: jest.fn() };
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
    eventsService.processEvent.mockResolvedValueOnce({ success: true, correlationId: 'corr-1' });
    await expect(controller.handleWebhook({ type: 'test' }, 'corr-1')).resolves.toEqual({ success: true, correlationId: 'corr-1' });
    expect(eventsService.processEvent).toHaveBeenCalledWith({ type: 'test' }, 'corr-1');
    expect(logger.logInfo).toHaveBeenCalledWith('Webhook processed successfully', { correlationId: 'corr-1' });
  });

  it('should generate correlation ID if not provided', async () => {
    eventsService.processEvent.mockResolvedValueOnce({ success: true, correlationId: 'generated-id' });
    const result = await controller.handleWebhook({ type: 'test' });
    expect(eventsService.processEvent.mock.calls[0][1]).toBeDefined();
    expect(result).toEqual({ success: true, correlationId: 'generated-id' });
    expect(logger.logInfo).toHaveBeenCalledWith('Webhook processed successfully', { correlationId: 'generated-id' });
  });

  it('should handle invalid payload', async () => {
    eventsService.processEvent.mockRejectedValueOnce({ status: 400, message: 'Validation error', getResponse: () => ({ details: 'details' }) });
    await expect(controller.handleWebhook(null)).rejects.toThrow('Validation error');
    expect(logger.logError).toHaveBeenCalled();
  });

  it('should handle business logic error', async () => {
    eventsService.processEvent.mockRejectedValueOnce(new Error('fail'));
    await expect(controller.handleWebhook({ type: 'test' })).rejects.toThrow('Internal server error');
    expect(logger.logError).toHaveBeenCalled();
  });

  it('should return 503 if service is shutting down', async () => {
    (healthService.isShuttingDownNow as jest.Mock).mockReturnValue(true);
    await expect(controller.handleWebhook({ type: 'test' })).rejects.toThrow('Service is shutting down');
    expect(eventsService.processEvent).not.toHaveBeenCalled();
  });
}); 