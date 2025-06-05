import { Injectable } from '@nestjs/common'
import { connect, NatsConnection, JetStreamClient, headers } from 'nats'
import { LoggerService } from '../../services/logger.service'
import { ConfigService } from '../../services/config.service'

@Injectable()
export class NatsPublisher {
  private nc: NatsConnection
  private js: JetStreamClient

  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigService
  ) {
    this.connect()
  }

  private async connect() {
    try {
      this.nc = await connect({ servers: this.config.get('NATS_URL') })
      this.js = this.nc.jetstream()
      this.logger.logInfo('Connected to NATS JetStream', {})
    } catch (error) {
      this.logger.logError('Failed to connect to NATS', { error: error.message })
      // Retry connection after delay
      setTimeout(() => this.connect(), 5000)
    }
  }

  async publish(topic: string, event: unknown, correlationId?: string) {
    if (!this.js) {
      this.logger.logError('Failed to publish: NATS JetStream not connected', { topic, correlationId })
      throw new Error('NATS JetStream not connected')
    }

    try {
      // Create topic name based on event source and type
      const eventObj = event as any
      const topicName = `${topic}.events.${eventObj.eventType}`
      
      // Create headers with correlation ID
      const hdrs = headers()
      if (correlationId) {
        hdrs.append('x-correlation-id', correlationId)
      }

      // Publish to JetStream
      const result = await this.js.publish(
        topicName,
        JSON.stringify(event),
        { headers: hdrs }
      )

      this.logger.logInfo('Event published to NATS', { 
        topic: topicName, 
        correlationId,
        sequence: result.seq
      })
      
      return result
    } catch (error) {
      this.logger.logError('Failed to publish event to NATS', { 
        topic, 
        correlationId,
        error: error.message 
      })
      throw error
    }
  }

  async onModuleDestroy() {
    if (this.nc) {
      await this.nc.drain()
      this.logger.logInfo('NATS connection closed gracefully', {})
    }
  }
} 