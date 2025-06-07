import { Injectable } from '@nestjs/common'
import { EventsReportFilter } from '../dto/events-report-filter.dto'
import { PrismaService } from '../../../common/services/prisma.service'
import { LoggerService } from '../../../common/services/logger.service'
import { MetricsService } from '../../metrics/services/metrics.service'
import { RevenueReportFilterDto } from '../../../common/dto/revenue-report-filter.dto'
import { CorrelationIdService } from '../../../common/services/correlation-id.service'

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
    private readonly correlationIdService: CorrelationIdService
  ) {}

  async getEventsReport(filter: EventsReportFilter) {
    const where: any = {}
    if (filter.from || filter.to) {
      where.timestamp = {}
      if (filter.from) {
        where.timestamp.gte = filter.from
      }
      if (filter.to) {
        where.timestamp.lte = filter.to
      }
    }
    if (filter.source) {
      where.source = filter.source
    }
    if (filter.funnelStage) {
      where.funnelStage = filter.funnelStage
    }
    if (filter.eventType) {
      where.eventType = filter.eventType
    }
    if (filter.campaignId) {
      where.campaignId = filter.campaignId
    }
    if (filter.userId) {
      where.userId = filter.userId
    }

    const result = await this.prisma.event.groupBy({
      by: [
        'timestamp',
        'source',
        'funnelStage',
        'eventType',
        'campaignId',
        'userId',
      ],
      where,
      _count: { _all: true },
      orderBy: { timestamp: 'asc' },
    })

    return result.map(item => ({
      date: item.timestamp.toISOString().slice(0, 10),
      source: item.source,
      funnelStage: item.funnelStage,
      eventType: item.eventType,
      campaignId: item.campaignId,
      userId: item.userId,
      count: item._count._all,
    }))
  }

  async getRevenueReport(filter: RevenueReportFilterDto) {
    const start = Date.now()
    const { from, to, source, campaignId, currency, page = 1 } = filter
    const limit = 50
    const skip = (page - 1) * limit

    const where: any = {
      ...(from || to
        ? {
            timestamp: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
      ...(campaignId && { campaignId }),
      ...(currency && { currency }),
    }

    if (source) {
      const rows = await this.prisma.event.findMany({
        where: { source },
        select: { campaignId: true },
        distinct: ['campaignId'],
      })
      const validIds = rows.map(r => r.campaignId)
      where.campaignId = { in: validIds }
    }

    const allGroups = await this.prisma.revenueEvent.groupBy({
      by: ['campaignId', 'currency'],
      where,
    })
    const total = allGroups.length

    const groups = await this.prisma.revenueEvent.groupBy({
      by: ['campaignId', 'currency'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { campaignId: 'asc' },
      skip,
      take: limit,
    })

    const data = groups.map(g => ({
      source: source || null,
      campaignId: g.campaignId,
      currency: g.currency,
      revenueSum: g._sum.amount,
      revenueCount: g._count._all,
    }))

    this.logger.logInfo('Revenue report aggregation', { filter, total, page, count: data.length })
    const processingTime = Date.now() - start
    this.metrics.observeProcessingTime(processingTime)

    return {
      data,
      pagination: {
        page,
        limit,
        total,
      },
    }
  }

  async getDemographicsReport(filter: any, correlationId: string = '') {
    const where: any = {}
    if (filter.from || filter.to) {
      where.AND = where.AND || []
      if (filter.from) {
        where.AND.push({ createdAt: { gte: filter.from } })
      }
      if (filter.to) {
        where.AND.push({ createdAt: { lte: filter.to } })
      }
    }
    if (filter.source) {
      where.source = filter.source
    }
    if (filter.age) {
      where.age = filter.age
    }
    if (filter.gender) {
      where.gender = filter.gender
    }
    if (filter.locationCountry || filter.locationCity) {
      where.location = {}
      if (filter.locationCountry) {
        where.location.country = filter.locationCountry
      }
      if (filter.locationCity) {
        where.location.city = filter.locationCity
      }
    }

    if (filter.followersMin !== undefined || filter.followersMax !== undefined) {
      where.followers = {}
      if (filter.followersMin !== undefined) {
        where.followers.gte = filter.followersMin
      }
      if (filter.followersMax !== undefined) {
        where.followers.lte = filter.followersMax
      }
    }

    let groupBy: Array<'age' | 'gender' | 'location' | 'followers' | 'source'> = []
    if (filter.source === 'facebook') {
      groupBy = ['age', 'gender', 'location']
    } else if (filter.source === 'tiktok') {
      groupBy = ['followers']
    } else {
      groupBy = ['source']
    }

    const result = await this.prisma.demographics.groupBy({
      by: groupBy as any,
      where,
      _count: { _all: true },
    })

    this.logger.logInfo('Demographics report aggregation', { filter, count: result.length, correlationId })

    return result.map(item => ({
      group: groupBy.reduce((acc, key) => {
        acc[key] = item[key]
        return acc
      }, {} as Record<string, any>),
      count: item._count ? (item._count as any)._all : 0,
    }))
  }
} 