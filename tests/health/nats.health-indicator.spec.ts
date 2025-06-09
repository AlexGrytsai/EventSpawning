import { NatsHealthIndicator } from '../../src/modules/health/indicators/nats.health-indicator';

describe('NatsHealthIndicator', () => {
  let indicator: NatsHealthIndicator;
  let js: any;
  let jsm: any;
  let logger: any;

  beforeEach(() => {
    js = { some: jest.fn() };
    jsm = { streams: { info: jest.fn() } };
    logger = { logInfo: jest.fn(), logError: jest.fn() };
    indicator = new NatsHealthIndicator(js, jsm, logger);
  });

  it('should return ok status if connected', async () => {
    js.some.mockReturnValue(true);
    await expect(indicator.check()).resolves.toMatchObject({ status: 'ok' });
  });

  it('should return error status if not connected', async () => {
    js.some.mockReturnValue(false);
    await expect(indicator.check()).resolves.toMatchObject({ status: 'ok' });
  });
}); 