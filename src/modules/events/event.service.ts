import { Injectable, BadRequestException } from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { EventSchema } from './event.zod'
import { LoggerService } from '../../services/logger.service'
import { NatsPublisher } from '../nats/nats.publisher'
import { MetricsModule } from '../metrics/metrics.module'

@Injectable()
/**
 * Service responsible for processing incoming events.
 * Validates the event payload, logs the event, publishes it to NATS,
 * and tracks metrics such as processing time and failure rates.
 */
export class EventsService {
  constructor(
    private readonly logger: LoggerService,
    private readonly nats: NatsPublisher,
    private readonly metrics: MetricsModule
  ) {}

  async processEvent(eventPayload: unknown, correlationId?: string) {
    const id = correlationId || uuidv4()
    const start = Date.now()
    const result = EventSchema.safeParse(eventPayload)
    if (!result.success) {
      this.logger.logError('Validation failed', { correlationId: id, errors: result.error.errors })
      // Increment a fixed metric label to avoid high-cardinality
      this.metrics.incrementFailed('validation_failed')
      throw new BadRequestException({ 
        message: 'Validation error', 
        details: result.error.errors 
      })
    }
    const event = result.data
    this.logger.logEvent('Event received', { correlationId: id, eventType: event.eventType, source: event.source })
    await this.nats.publish(event.source, event, id)
    this.metrics.incrementAccepted(event.source, event.funnelStage, event.eventType)
    this.metrics.observeProcessingTime(Date.now() - start)
    return { success: true, correlationId: id }
  }
}