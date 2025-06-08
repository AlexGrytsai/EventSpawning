import { Module } from '@nestjs/common'
import { EventsController } from './controllers/events.controller'
import { EventsService } from './services/event.service'
import { LoggerService } from '../../common/services/logger.service'
import { MetricsService } from '../metrics/services/metrics.service'
import { HealthService } from '../health/services/health.service'
import { PrismaService } from '../../common/services/prisma.service'
import { NatsPublisher } from '../nats/services/nats.publisher'
import { CorrelationIdService } from '../../common/services/correlation-id.service'

@Module({
  controllers: [EventsController],
  providers: [
    EventsService,
    LoggerService,
    MetricsService,
    HealthService,
    PrismaService,
    NatsPublisher,
    CorrelationIdService,
  ],
  exports: [EventsService],
})
export class EventsModule {} 