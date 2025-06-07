import { Injectable, Inject } from '@nestjs/common'
import { JetStreamClient, consumerOpts, StringCodec } from 'nats'
import { v4 as uuidv4 } from 'uuid'
import { LoggerService } from '../../services/logger.service'
import { CorrelationIdService } from '../../services/correlation-id.service'

@Injectable()
export class NatsConsumer {
  constructor(
    @Inject('NATS_JS') private readonly js: JetStreamClient,
    private readonly logger: LoggerService,
    private readonly correlationIdService: CorrelationIdService
  ) {}

  async subscribe(subject: string, durable: string) {
    const opts = consumerOpts()
    opts.durable(durable)
    opts.manualAck()
    opts.ackExplicit()
    opts.deliverTo(`${subject}_deliver`)
    const sc = StringCodec()
    const sub = await this.js.subscribe(subject, opts)
    for await (const m of sub) {
      const hdrs = m.headers
      let correlationId = hdrs?.get('x-correlation-id') ?? this.correlationIdService.getId() ?? uuidv4()
      this.correlationIdService.runWithId(correlationId, () => {
        let event
        try {
          event = JSON.parse(sc.decode(m.data))
        } catch {
          this.logger.logError('Invalid event format', { correlationId })
          m.term()
          return
        }
        this.logger.logEvent('Event received', { eventType: event.eventType, source: event.source, correlationId })
        // ... event processing logic ...
        m.ack()
      })
    }
  }
} 