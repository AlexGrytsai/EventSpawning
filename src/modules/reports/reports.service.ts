import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { EventsReportFilter } from './events-report-filter.dto'
import { PrismaService } from '../../services/prisma.service'
import { LoggerService } from '../../services/logger.service'
import { MetricsService } from '../metrics/metrics.service'
import { RevenueReportFilterDto } from '../../reporter/dto/revenue-report-filter.dto'

const prisma = new PrismaClient()

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService
  ) {}

  async getEventsReport(filter: EventsReportFilter) {
    const where: any = {}
    if (filter.from || filter.to) {
      where.timestamp = {}
      if (filter.from) where.timestamp.gte = filter.from
      if (filter.to) where.timestamp.lte = filter.to
    }
    if (filter.source) where.source = filter.source
    if (filter.funnelStage) where.funnelStage = filter.funnelStage
    if (filter.eventType) where.eventType = filter.eventType
    if (filter.campaignId) where.campaignId = filter.campaignId
    if (filter.userId) where.userId = filter.userId

    const result = await prisma.event.groupBy({
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

  async getRevenueReport(filter: RevenueReportFilterDto, correlationId: string) {
    const { from, to, source, campaignId, currency, page = 1 } = filter
    const where: any = {}
    if (from || to) {
      where.timestamp = {}
      if (from) where.timestamp.gte = new Date(from)
      if (to) where.timestamp.lte = new Date(to)
    }
    if (campaignId) where.campaignId = campaignId
    if (currency) where.currency = currency
    // RevenueEvent не содержит source, поэтому фильтруем по campaignId только если нужно
    // Для source фильтрация по связанным Event (если потребуется)

    // Получаем все группы для пагинации
    const allGroups = await this.prisma.revenueEvent.groupBy({
      by: ['campaignId', 'currency'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: [{ campaignId: 'asc' }],
    })

    // Фильтрация по source (если задан) через связанные Event
    let filteredGroups = allGroups
    if (source) {
      // Получаем campaignId, которые соответствуют source через Event
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

    this.logger.logInfo('Revenue report aggregation', { correlationId, filter, total, page, count: data.length })
    this.metrics.observeProcessingTime(0) // Здесь можно измерять время агрегации, если нужно

    return {
      data,
      pagination: {
        page,
        limit,
        total,
      },
    }
  }
} 