import { EventsController } from '../events.controller';
import { EventsService } from '../../modules/events/event.service';
import { LoggerService } from '../../services/logger.service';
import { MetricsService } from '../../modules/metrics/metrics.service';
import { register } from 'prom-client';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: { processEvent: jest.Mock };
  let logger: LoggerService;
  let metrics: MetricsService;

  beforeEach(() => {
    register.clear();
    eventsService = { processEvent: jest.fn() };
    logger = new LoggerService({ get: jest.fn() } as any);
    metrics = new MetricsService() as any;
    jest.spyOn(logger, 'logInfo').mockImplementation(jest.fn());
    jest.spyOn(logger, 'logError').mockImplementation(jest.fn());
    jest.spyOn(metrics, 'incrementAccepted').mockImplementation(jest.fn());
    jest.spyOn(metrics, 'incrementFailed').mockImplementation(jest.fn());
    controller = new EventsController(eventsService as any, logger, metrics);
  });

  it('should handle webhook successfully', async () => {
    eventsService.processEvent.mockResolvedValueOnce({ success: true, correlationId: 'corr-1' });
    await expect(controller.handleWebhook({ type: 'test' }, 'corr-1')).resolves.toEqual({ success: true, correlationId: 'corr-1' });
    expect(eventsService.processEvent).toHaveBeenCalled();
    expect(logger.logInfo).toHaveBeenCalled();
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
}); 