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
    const errors: unknown[] = []
    if (this.events) {
      try {
        await this.events.awaitAllTasksDone()
      } catch (e) {
        errors.push(e)
      }
    }
    try {
      await this.prisma.onModuleDestroy()
    } catch (e) {
      errors.push(e)
    }
    try {
      await this.nats.onModuleDestroy()
    } catch (e) {
      errors.push(e)
    }
    if (errors.length) {
      throw errors[0]
    }
  }
} 