import { Injectable, BadRequestException } from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { EventSchema } from './event.zod'
import { LoggerService } from '../../services/logger.service'
import { NatsPublisher } from '../nats/nats.publisher'
import { MetricsService } from '../metrics/metrics.service'

@Injectable()
/**
 * Service responsible for processing incoming events.
 * Validates the event payload, logs the event, publishes it to NATS,
 * and tracks metrics such as processing time and failure rates.
 */
export class EventsService {
  private activeTasks = 0
  private allTasksDoneResolver: (() => void) | null = null
  private allTasksDonePromise: Promise<void> | null = null

  constructor(
    private readonly logger: LoggerService,
    private readonly nats: NatsPublisher,
    private readonly metrics: MetricsService
  ) {}

  /**
   * Validates the given event payload and logs it.
   * If the event is invalid, throws a BadRequestException.
   * If the event is valid, publishes it to NATS and tracks metrics.
   * @param eventPayload The event payload to validate and process.
   * @param correlationId An optional correlation ID to track the event.
   * @returns A promise that resolves with a result object containing a success flag and the correlation ID.
   */
  async processEvent(eventPayload: unknown, correlationId?: string) {
    this.activeTasks++
    try {
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
    } finally {
      this.activeTasks--
      if (this.activeTasks === 0 && this.allTasksDoneResolver) {
        this.allTasksDoneResolver()
        this.allTasksDoneResolver = null
        this.allTasksDonePromise = null
      }
    }
  }

  awaitAllTasksDone(): Promise<void> {
    if (this.activeTasks === 0) return Promise.resolve()
    if (!this.allTasksDonePromise) {
      this.allTasksDonePromise = new Promise(resolve => {
        this.allTasksDoneResolver = resolve
      })
    }
    return this.allTasksDonePromise
  }
}
