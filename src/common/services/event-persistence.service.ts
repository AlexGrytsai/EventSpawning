import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class EventPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async saveEvent(event: any) {
    const userData = event.data?.user;
    if (!userData || !userData.userId) {
      throw new Error('Event does not contain valid user data');
    }

    let upsertData: any = {
      id: userData.userId,
      source: event.source,
    };

    if (event.source === 'facebook') {
      upsertData = {
        ...upsertData,
        name: userData.name,
        age: userData.age,
        gender: userData.gender,
        location: userData.location,
        followers: undefined,
      };
    } else if (event.source === 'tiktok') {
      upsertData = {
        ...upsertData,
        name: userData.username,
        age: undefined,
        gender: undefined,
        location: undefined,
        followers: userData.followers,
      };
    }

    try {
      const campaignId = event.data.engagement?.campaignId;
      await this.prisma.$transaction(async (tx) => {
        await tx.user.upsert({
          where: { id: userData.userId },
          update: upsertData,
          create: upsertData,
        });
        if (campaignId) {
          await tx.campaign.upsert({
            where: { id: campaignId },
            update: {},
            create: { id: campaignId },
          });
        }
        await tx.event.create({
          data: {
            id: uuidv4(),
            eventId: event.eventId,
            timestamp: new Date(event.timestamp),
            source: event.source,
            funnelStage: event.funnelStage,
            eventType: event.eventType,
            userId: userData.userId,
            campaignId: campaignId,
            engagement: event.data.engagement,
            raw: event,
          } as any,
        });
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('eventId')) {
        // Unique constraint violation for eventId, ignore or log
      } else {
        throw error;
      }
    }
  }
} 