import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Injectable()
export class EventPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async saveEvent(event: any) {
    const userData = event.data.user
    const user = await this.prisma.user.upsert({
      where: { id: userData.userId },
      update: {
        name: userData.name,
        age: userData.age,
        gender: userData.gender,
        location: userData.location ? userData.location : undefined,
        followers: userData.followers,
        source: event.source,
      },
      create: {
        id: userData.userId,
        name: userData.name,
        age: userData.age,
        gender: userData.gender,
        location: userData.location ? userData.location : undefined,
        followers: userData.followers,
        source: event.source,
      },
    })
    await this.prisma.event.create({
      data: {
        id: event.eventId,
        eventId: event.eventId,
        timestamp: new Date(event.timestamp),
        source: event.source,
        funnelStage: event.funnelStage,
        eventType: event.eventType,
        userId: user.id,
        campaignId: event.data.engagement.campaignId ?? undefined,
        engagement: event.data.engagement,
        raw: event,
      },
    })
  }
} 