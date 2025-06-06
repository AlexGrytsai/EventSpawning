import { Injectable } from '@nestjs/common'
import { HealthService } from '../health/health.service'
import { EventsService } from '../modules/events/event.service'
import { PrismaService } from './prisma.service'
import { NatsPublisher } from '../modules/nats/nats.publisher'

@Injectable()
export class ShutdownService {
  constructor(
    private readonly health: HealthService,
    private readonly events: EventsService,
    private readonly prisma: PrismaService,
    private readonly nats: NatsPublisher
  ) {}

  async shutdown() {
    this.health.setReadiness(false)
    await this.events.awaitAllTasksDone()
    await this.nats.onModuleDestroy()
    await this.prisma.onModuleDestroy()
  }
} 