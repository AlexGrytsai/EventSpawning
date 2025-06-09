import { Module } from '@nestjs/common'
import { EventsController } from './controllers/events.controller'
import { EventsService } from './services/event.service'
import { HealthModule } from '../health/health.module'
import { PrismaService } from '../../common/services/prisma.service'
import { NatsPublisher } from '../nats/services/nats.publisher'
import { MetricsModule } from '../metrics/metrics.module'
import { LoggerModule } from '../../common/services/logger.module'
import { NatsModule } from '../nats/nats.module'
import { EventStorageService } from './services/event-storage.service'
import { EventDispatcherService } from './services/event-dispatcher.service'
import { DeadLetterQueueService } from './services/dead-letter-queue.service'

@Module({
  imports: [MetricsModule, LoggerModule, HealthModule, NatsModule],
  controllers: [EventsController],
  providers: [
    EventsService,
    PrismaService,
    NatsPublisher,
    EventStorageService,
    EventDispatcherService,
    DeadLetterQueueService,
  ],
  exports: [EventsService, EventStorageService, EventDispatcherService, DeadLetterQueueService],
})
export class EventsModule {} 