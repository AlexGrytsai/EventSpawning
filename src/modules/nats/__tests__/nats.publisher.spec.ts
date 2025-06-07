import { NatsPublisher } from '../nats.publisher';

describe('NatsPublisher', () => {
  let publisher: NatsPublisher;
  let natsClient: any;
  let loggerService: any;
  let metricsService: any;

  beforeEach(async () => {
    natsClient = { publish: jest.fn() };
    loggerService = {
      logInfo: jest.fn(),
      logError: jest.fn(),
    };
    metricsService = {
      incrementFailed: jest.fn(),
    };
    publisher = new NatsPublisher(natsClient, loggerService, metricsService);
    await publisher.onModuleInit();
  });

  it('should publish event successfully', async () => {
    natsClient.publish.mockResolvedValueOnce(true);
    await publisher.publish('topic', { eventType: 'test' }, 'corr-1');
    expect(natsClient.publish).toHaveBeenCalled();
    expect(loggerService.logInfo).toHaveBeenCalled();
  });

  it('should handle publish error', async () => {
    natsClient.publish.mockRejectedValueOnce(new Error('fail'));
    await expect(publisher.publish('topic', { eventType: 'test' })).rejects.toThrow('Failed to publish event to NATS');
    expect(metricsService.incrementFailed).toHaveBeenCalled();
    expect(loggerService.logError).toHaveBeenCalled();
  });
}); 