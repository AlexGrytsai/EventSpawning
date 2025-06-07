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

describe('ReportsService - getDemographicsReport', () => {
  let service: ReportsService
  let prisma: any
  let logger: any
  let metrics: any

  beforeEach(() => {
    prisma = { demographics: { groupBy: jest.fn() } }
    logger = { logInfo: jest.fn() }
    metrics = { observeProcessingTime: jest.fn() }
    service = new ReportsService(prisma, logger, metrics)
  })

  it('aggregates by age, gender, location for Facebook', async () => {
    prisma.demographics.groupBy.mockResolvedValue([
      { age: 25, gender: 'male', location: { country: 'RU', city: 'Moscow' }, _count: { _all: 10 } },
      { age: 30, gender: 'female', location: { country: 'RU', city: 'SPB' }, _count: { _all: 5 } },
    ])
    const filter = { source: 'facebook' }
    const result = await service.getDemographicsReport(filter, 'cid')
    expect(result).toEqual([
      { group: { age: 25, gender: 'male', location: { country: 'RU', city: 'Moscow' } }, count: 10 },
      { group: { age: 30, gender: 'female', location: { country: 'RU', city: 'SPB' } }, count: 5 },
    ])
  })

  it('aggregates by followers for Tiktok', async () => {
    prisma.demographics.groupBy.mockResolvedValue([
      { followers: 1000, _count: { _all: 7 } },
      { followers: 5000, _count: { _all: 2 } },
    ])
    const filter = { source: 'tiktok' }
    const result = await service.getDemographicsReport(filter, 'cid')
    expect(result).toEqual([
      { group: { followers: 1000 }, count: 7 },
      { group: { followers: 5000 }, count: 2 },
    ])
  })

  it('filters by all fields', async () => {
    prisma.demographics.groupBy.mockResolvedValue([
      { age: 18, gender: 'female', location: { country: 'RU', city: 'Kazan' }, followers: 200, source: 'facebook', _count: { _all: 1 } },
    ])
    const filter = {
      source: 'facebook',
      age: 18,
      gender: 'female',
      locationCountry: 'RU',
      locationCity: 'Kazan',
      followersMin: 100,
      followersMax: 300,
    }
    const result = await service.getDemographicsReport(filter, 'cid')
    expect(result).toEqual([
      { group: { age: 18, gender: 'female', location: { country: 'RU', city: 'Kazan' } }, count: 1 },
    ])
  })

  it('returns empty array if no data', async () => {
    prisma.demographics.groupBy.mockResolvedValue([])
    const filter = { source: 'facebook' }
    const result = await service.getDemographicsReport(filter, 'cid')
    expect(result).toEqual([])
  })
}) 