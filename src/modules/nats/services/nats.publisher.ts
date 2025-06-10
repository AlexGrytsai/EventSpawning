import { Injectable, Inject, OnModuleInit, OnModuleDestroy, HttpException, HttpStatus } from '@nestjs/common'
import { JetStreamClient, headers } from 'nats'
import { LoggerService } from '../../../common/services/logger.service'
import { MetricsService } from '../../metrics/services/metrics.service'

@Injectable()
export class NatsPublisher implements OnModuleInit, OnModuleDestroy {
  private readyPromise: Promise<void>
  private readyResolve: () => void

  /**
   * Constructs a new instance of the NatsPublisher.
   *
   * @param js - The JetStreamClient instance injected for publishing events.
   * @param logger - The LoggerService instance for logging messages and errors.
   * @param metrics - The MetricsModule instance for tracking metrics.
   */
  constructor(
    @Inject('NATS_JS') private readonly js: JetStreamClient,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })
  }

  /**
   * Resolves the readyPromise when the module is initialized. This is a temporary
   * measure until NestJS supports async providers.
   */
  async onModuleInit() {
    this.readyResolve()
  }

  /**
   * Publishes an event to NATS JetStream.
   *
   * The event is published to a subject in the form of
   * `<baseTopic>.events.<eventType>`.
   *
   * @param baseTopic - The base topic to publish to.
   * @param event - The event to publish, which must include an `eventType` property.
   * @param correlationId - An optional correlation ID to include in the headers.
   * @param maxRetries - The maximum number of retry attempts.
   * @param initialDelay - The initial delay between retry attempts.
   *
   * @returns A promise that resolves with the result of publishing the message.
   *
   * @throws HttpException if publishing the message fails.
   */
  async publish(
    baseTopic: string,
    event: { eventType: string },
    correlationId?: string,
    maxRetries = 5,
    initialDelay = 200
  ) {
    if (!this.readyResolve) {
      throw new HttpException(
        'NatsPublisher is not initialized yet',
        HttpStatus.SERVICE_UNAVAILABLE
      )
    }
    await this.readyPromise
    const subject = this.formatSubject(baseTopic, event.eventType)
    const hdrs = this.buildHeaders(correlationId)

    let attempt = 0
    let delay = initialDelay
    while (attempt <= maxRetries) {
      try {
        const result = await this.js.publish(
          subject,
          JSON.stringify(event),
          { headers: hdrs },
        )
        this.logger.logInfo('Event published to NATS', {
          subject,
          correlationId,
          seq: result.seq,
        })
        return {
          success: true,
          correlationId: correlationId || 'unknown',
          subject,
          seq: result.seq
        }
      } catch (err: any) {
        const is503 = err?.message?.includes('503') || err?.code === 503
        this.logger.logError('Failed to publish event to NATS', {
          subject,
          correlationId,
          error: err.message,
          attempt,
        })
        const errorCategory = err?.name || 'UnknownError'
        this.metrics.incrementFailed(errorCategory)
        if (is503 && attempt < maxRetries) {
          // Add jitter to the delay to avoid retry storms
          const jitter = Math.random() * delay
          const jitteredDelay = delay + jitter
          await new Promise(res => setTimeout(res, jitteredDelay))
          delay = Math.min(delay * 2, 5000)
          attempt++
          continue
        }
        throw new HttpException(
          'Failed to publish event to NATS',
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      }
    }
  }

  /**
   * Formats a subject string in the form of `<baseTopic>.events.<eventType>`.
   *
   * @param base - The base topic to use.
   * @param type - The event type to append to the subject.
   *
   * @returns The formatted subject string.
   */
  private formatSubject(base: string, type: string): string {
    return `${base}.events.${type}`
  }

  private buildHeaders(correlationId?: string) {
    const h = headers()
    if (correlationId) {
      h.append('x-correlation-id', correlationId)
    }
    return h
  }

  async onModuleDestroy() {
    interface Closable {
      close: () => Promise<void> | void
    }
    const client = this.js as unknown
    if (typeof client === 'object' && client !== null && 'close' in client && typeof (client as Closable).close === 'function') {
      await (client as Closable).close()
    }
  }

  async batchPublish(
    baseTopic: string,
    events: { eventType: string }[],
    correlationId?: string
  ) {
    await this.readyPromise
    return await Promise.all(
          events.map(async (event) => {
            try {
              return await this.publish(baseTopic, event, correlationId)
            } catch (err) {
              return { success: false, error: err instanceof Error ? err.message : err, event }
            }
          })
        );
  }
} 