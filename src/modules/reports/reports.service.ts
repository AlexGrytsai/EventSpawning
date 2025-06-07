import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { EventsReportFilter } from './events-report-filter.dto'
import { PrismaService } from '../../services/prisma.service'
import { LoggerService } from '../../services/logger.service'
import { MetricsService } from '../metrics/metrics.service'
import { RevenueReportFilterDto } from '../../reporter/dto/revenue-report-filter.dto'
import { CorrelationIdService } from '../../services/correlation-id.service'

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
    const { from, to, source, campaignId, currency, page = 1 } = filter
    const where: any = {}
    if (from || to) {
      where.timestamp = {}
      if (from) {
        where.timestamp.gte = new Date(from)
      }
      if (to) {
        where.timestamp.lte = new Date(to)
      }
    }
    if (campaignId) {
      where.campaignId = campaignId
    }
    if (currency) {
      where.currency = currency
    }
    // RevenueEvent does not contain source, so we filter by campaignId only if needed
    // For source filtering by related Events (if needed)

    // Get all groups for pagination
    const allGroups = await this.prisma.revenueEvent.groupBy({
      by: ['campaignId', 'currency'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: [{ campaignId: 'asc' }],
    })

    // Filtering by source (if specified) using related Event
    let filteredGroups = allGroups
    if (source) {
      // Get campaignId that correspond to source through Event
      const campaignIds = await this.prisma.event.findMany({
        where: { source, campaignId: { in: allGroups.map(g => g.campaignId).filter((id): id is string => !!id) } },
        select: { campaignId: true },
        distinct: ['campaignId'],
      })
      const validIds = campaignIds.map(c => c.campaignId)
      filteredGroups = allGroups.filter(g => g.campaignId && validIds.includes(g.campaignId))
    }

    const total = filteredGroups.length
    const limit = 50
    const offset = (page - 1) * limit
    const pagedGroups = filteredGroups.slice(offset, offset + limit)

    const data = pagedGroups.map(g => ({
      source: source || null,
      campaignId: g.campaignId,
      currency: g.currency,
      revenueSum: g._sum.amount,
      revenueCount: g._count._all,
    }))

    this.logger.logInfo('Revenue report aggregation', { filter, total, page, count: data.length })
    this.metrics.observeProcessingTime(0)

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