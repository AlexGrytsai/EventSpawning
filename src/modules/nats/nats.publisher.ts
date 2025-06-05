import { Injectable, Inject } from '@nestjs/common'
import { JetStreamClient, headers } from 'nats'
import { LoggerService } from '../../services/logger.service'

@Injectable()
export class NatsPublisher {
  constructor(
    @Inject('NATS_JS') private readonly js: JetStreamClient,
    private readonly logger: LoggerService,
  ) {}

  async publish(
    baseTopic: string,
    event: { eventType: string },
    correlationId?: string,
  ) {
    const subject = this.formatSubject(baseTopic, event.eventType)
    const hdrs = this.buildHeaders(correlationId)

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
      return result
    } catch (err) {
      this.logger.logError('Failed to publish event to NATS', {
        subject,
        correlationId,
        error: err.message,
      })
      throw err
    }
  }

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
} 