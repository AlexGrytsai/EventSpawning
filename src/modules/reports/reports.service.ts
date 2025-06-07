import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { EventsReportFilter } from './events-report-filter.dto'

const prisma = new PrismaClient()

@Injectable()
export class ReportsService {
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
} 