import { Injectable, Optional } from '@nestjs/common'
import { HealthService } from '../health/health.service'
import { EventsService } from '../modules/events/event.service'
import { PrismaService } from './prisma.service'
import { NatsPublisher } from '../modules/nats/nats.publisher'

@Injectable()
export class ShutdownService {
  constructor(
    private readonly health: HealthService,
    private readonly prisma: PrismaService,
    private readonly nats: NatsPublisher,
    @Optional() private readonly events?: EventsService
  ) {}

  async shutdown() {
    this.health.setReadiness(false)
    if (this.events) {
      await this.events.awaitAllTasksDone()
    }
  }
} 