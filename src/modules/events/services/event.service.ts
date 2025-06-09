import { Injectable, BadRequestException } from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { EventSchema } from '../dto/event.zod'
import { LoggerService } from '../../../common/services/logger.service'
import { NatsPublisher } from '../../nats/services/nats.publisher'
import { MetricsService } from '../../metrics/services/metrics.service'
import { PrismaService } from '../../../common/services/prisma.service'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { CorrelationIdService } from '../../../common/services/correlation-id.service'

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
    private readonly metrics: MetricsService,
    private readonly prisma: PrismaService,
    private readonly correlationIdService: CorrelationIdService
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
    const id = correlationId ?? this.correlationIdService.getId() ?? uuidv4()
    return this.correlationIdService.runWithId(id, async () => {
      this.activeTasks++
      const start = Date.now()
      try {
        const result = EventSchema.safeParse(eventPayload)
        if (!result.success) {
          this.logger.logError('Validation failed', { errors: result.error.errors, correlationId: id })
          this.metrics.incrementFailed('validation_failed')
          throw new BadRequestException({ 
            message: 'Validation error', 
            details: result.error.errors 
          })
        }
        const event = result.data
        this.logger.logEvent('Event received', { eventType: event.eventType, source: event.source, correlationId: id })
        try {
          await this.prisma.event.create({
            data: {
              id: uuidv4(),
              eventId: event.eventId,
              timestamp: new Date(event.timestamp),
              source: event.source,
              funnelStage: event.funnelStage,
              eventType: event.eventType,
              userId: event.data?.user?.userId ?? null,
              campaignId: (event.data?.engagement && typeof event.data.engagement === 'object' && 'campaignId' in event.data.engagement)
                ? event.data.engagement.campaignId
                : null,
              engagement: event.data?.engagement ?? null,
              raw: event,
            } as any
          })
        } catch (err) {
          if (
            (err instanceof PrismaClientKnownRequestError ||
              (err && err.name === 'PrismaClientKnownRequestError' && err.code === 'P2002')) &&
            Array.isArray(err.meta?.target) &&
            err.meta.target.includes('eventId')
          ) {
            return { success: true, alreadyProcessed: true, correlationId: id }
          }
          throw err
        }
        try {
          await this.nats.publish(event.source, event, id)
        } catch (err) {
          this.metrics.incrementFailed('publish_failed')
          this.logger.logError('Publish failed', {
            error: err instanceof Error ? err.message : err,
            errorStack: err instanceof Error && err.stack ? err.stack : undefined,
            errorObject: err,
            correlationId: id
          })
          throw err
        }
        this.metrics.incrementAccepted(event.source, event.funnelStage, event.eventType)
        return { success: true, correlationId: id }
      } finally {
        this.metrics.observeProcessingTime(Date.now() - start)
        this.activeTasks--
        if (this.activeTasks === 0 && this.allTasksDoneResolver) {
          this.allTasksDoneResolver()
          this.allTasksDoneResolver = null
          this.allTasksDonePromise = null
        }
      }
    })
  }

  awaitAllTasksDone(): Promise<void> {
    if (this.activeTasks === 0) {
      return Promise.resolve()
    }
    if (!this.allTasksDonePromise) {
      this.allTasksDonePromise = new Promise(resolve => {
        this.allTasksDoneResolver = resolve
      })
    }
    return this.allTasksDonePromise
  }

  async processEvents(eventPayloads: unknown[], correlationId?: string) {
    const results: Array<
      { success: boolean; correlationId: string; alreadyProcessed?: boolean } |
      { success: false; error: any; correlationId?: string }
    > = []
    for (const payload of eventPayloads) {
      try {
        const result = await this.processEvent(payload, correlationId)
        results.push(result)
      } catch (error) {
        results.push({ success: false, error: error.message, correlationId })
      }
    }
    return results
  }
}
