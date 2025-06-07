import { ReportsService } from '../reports.service'
import { PrismaService } from '../../../services/prisma.service'
import { LoggerService } from '../../../services/logger.service'
import { MetricsService } from '../../metrics/metrics.service'

describe('ReportsService - getRevenueReport', () => {
  let service: ReportsService
  let prisma: PrismaService & {
    revenueEvent: { groupBy: jest.Mock<any, any> }
    event: { findMany: jest.Mock<any, any> }
  }
  let logger: jest.Mocked<LoggerService>
  let metrics: jest.Mocked<MetricsService>

  beforeEach(() => {
    const revenueEvent = { groupBy: jest.fn() }
    const event = { findMany: jest.fn() }
    prisma = {
      revenueEvent,
      event,
    } as PrismaService & {
      revenueEvent: { groupBy: jest.Mock<any, any> }
      event: { findMany: jest.Mock<any, any> }
    }
    logger = { logInfo: jest.fn() } as any
    metrics = { observeProcessingTime: jest.fn() } as any
    service = new ReportsService(prisma, logger, metrics)
  })

  it('should return empty data if no revenue events', async () => {
    prisma.revenueEvent.groupBy.mockResolvedValue([])
    const result = await service.getRevenueReport({}, 'cid')
    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
  })

  it('should aggregate and paginate revenue events', async () => {
    prisma.revenueEvent.groupBy.mockResolvedValue([
      { campaignId: 'c1', currency: 'USD', _sum: { amount: 100 }, _count: { _all: 2 } },
      { campaignId: 'c2', currency: 'USD', _sum: { amount: 200 }, _count: { _all: 3 } },
    ])
    const result = await service.getRevenueReport({ page: 1 }, 'cid')
    expect(result.data.length).toBe(2)
    expect(result.data[0]).toMatchObject({ campaignId: 'c1', revenueSum: 100, revenueCount: 2 })
    expect(result.pagination.total).toBe(2)
  })

  it('should filter by source using related events', async () => {
    prisma.revenueEvent.groupBy.mockResolvedValue([
      { campaignId: 'c1', currency: 'USD', _sum: { amount: 100 }, _count: { _all: 2 } },
      { campaignId: 'c2', currency: 'USD', _sum: { amount: 200 }, _count: { _all: 3 } },
    ])
    prisma.event.findMany.mockResolvedValue([{ campaignId: 'c2' }])
    const result = await service.getRevenueReport({ source: 'facebook', page: 1 }, 'cid')
    expect(result.data.length).toBe(1)
    expect(result.data[0].campaignId).toBe('c2')
    expect(result.pagination.total).toBe(1)
  })

  it('should paginate results', async () => {
    const groups = Array.from({ length: 60 }, (_, i) => ({
      campaignId: `c${i + 1}`,
      currency: 'USD',
      _sum: { amount: 10 * (i + 1) },
      _count: { _all: 1 },
    }))
    prisma.revenueEvent.groupBy.mockResolvedValue(groups)
    const result = await service.getRevenueReport({ page: 2 }, 'cid')
    expect(result.data.length).toBe(10)
    expect(result.pagination.page).toBe(2)
    expect(result.pagination.limit).toBe(50)
    expect(result.pagination.total).toBe(60)
  })
}) 