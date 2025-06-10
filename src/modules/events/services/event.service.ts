import { Injectable, BadRequestException } from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { EventSchema } from '../dto/event.zod'
import { LoggerService } from '../../../common/services/logger.service'
import { NatsPublisher } from '../../nats/services/nats.publisher'
import { MetricsService } from '../../metrics/services/metrics.service'
import { PrismaService } from '../../../common/services/prisma.service'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { CorrelationIdService } from '../../../common/services/correlation-id.service'
import { DeadLetterQueueService } from './dead-letter-queue.service'
import { z } from 'zod'
import pLimit from 'p-limit'
import { EventPersistenceService } from '../../../common/services/event-persistence.service'

type EventType = z.infer<typeof EventSchema>

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
    private readonly correlationIdService: CorrelationIdService,
    private readonly dlq: DeadLetterQueueService,
    private readonly eventPersistence: EventPersistenceService
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
          await this.eventPersistence.saveEvent(event)
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

  async processEventsBatch(eventPayloads: unknown[], correlationId?: string) {
    let chunkSize = Number(process.env.EVENTS_CHUNK_SIZE)
    if (isNaN(chunkSize)) {
      chunkSize = 100
    }
    let concurrency = Number(process.env.EVENTS_BATCH_CONCURRENCY)
    if (isNaN(concurrency)) {
      concurrency = 5
    }
    const validEvents: EventType[] = []
    const invalidResults: { success: false; error: unknown; payload: unknown }[] = []
    for (const payload of eventPayloads) {
      const result = EventSchema.safeParse(payload)
      if (result.success) {
        validEvents.push(result.data)
      } else {
        invalidResults.push({ success: false, error: result.error.errors, payload })
      }
    }
    const chunks: EventType[][] = []
    for (let i = 0; i < validEvents.length; i += chunkSize) {
      chunks.push(validEvents.slice(i, i + chunkSize))
    }
    const results: Array<any> = [...invalidResults]
    const limit = pLimit(concurrency)
    const chunkPromises = chunks.map(chunk => limit(async () => {
      this.metrics.incrementBatchConcurrency()
      const start = Date.now()
      try {
        for (const event of chunk) {
          await this.eventPersistence.saveEvent(event)
        }
        const publishResults = await this.nats.batchPublish(chunk[0].source, chunk, correlationId)
        results.push(...publishResults)
        this.metrics.incrementAccepted(chunk[0].source, chunk[0].funnelStage, chunk[0].eventType)
      } catch (err) {
        await this.dlq.saveChunk(chunk)
        results.push({ success: false, error: err instanceof Error ? err.message : err, chunk })
      } finally {
        const duration = Date.now() - start
        this.metrics.observeBatchChunkProcessingTime(duration)
        this.metrics.decrementBatchConcurrency()
      }
    }))
    await Promise.all(chunkPromises)
    return results
  }
}
