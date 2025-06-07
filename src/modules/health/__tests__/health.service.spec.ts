import { HealthService } from '../services/health.service';

describe('HealthService', () => {
  let service: HealthService;
  let natsHealth: any;
  let pgHealth: any;
  let logger: any;
  let config: any;

  beforeEach(() => {
    natsHealth = { check: jest.fn().mockResolvedValue({ name: 'nats', status: 'ok' }) };
    pgHealth = { check: jest.fn().mockResolvedValue({ name: 'postgres', status: 'ok' }) };
    logger = { logInfo: jest.fn(), logError: jest.fn() };
    config = { get: jest.fn().mockReturnValue('nats,postgres') };
    service = new HealthService(natsHealth, pgHealth, logger, config);
  });

  it('should check readiness successfully', async () => {
    await expect(service.checkReadiness()).resolves.toEqual({
      isReady: true,
      checks: [
        { name: 'nats', status: 'ok' },
        { name: 'postgres', status: 'ok' },
      ],
    });
  });

  it('should set readiness', () => {
    expect(() => service.setReadiness(true)).not.toThrow();
    expect(() => service.setReadiness(false)).not.toThrow();
  });

  it('should handle dependency check failure', async () => {
    natsHealth.check.mockRejectedValueOnce(new Error('fail'));
    await expect(service.checkReadiness()).resolves.toMatchObject({ isReady: false });
    expect(logger.logError).toHaveBeenCalled();
  });
}); 