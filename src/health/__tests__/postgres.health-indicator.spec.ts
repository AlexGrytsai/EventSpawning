import { PostgresHealthIndicator } from '../postgres.health-indicator';

describe('PostgresHealthIndicator', () => {
  let indicator: PostgresHealthIndicator;
  let prisma: any;
  let logger: any;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn() };
    logger = { logInfo: jest.fn(), logError: jest.fn() };
    indicator = new PostgresHealthIndicator(prisma, logger);
  });

  it('should return ok status if query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValueOnce(1);
    await expect(indicator.check()).resolves.toMatchObject({ status: 'ok' });
  });

  it('should return error status if query fails', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('fail'));
    await expect(indicator.check()).resolves.toMatchObject({ status: 'error' });
  });
}); 