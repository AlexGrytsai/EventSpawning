import { Injectable, Inject } from '@nestjs/common'
import { JetStreamClient, JetStreamManager } from 'nats'
import { HealthCheck } from './health.service'
import { LoggerService } from '../services/logger.service'

@Injectable()
export class NatsHealthIndicator {
  constructor(
    @Inject('NATS_JS') private readonly js: JetStreamClient,
    @Inject('NATS_JSM') private readonly jsm: JetStreamManager,
    private readonly logger: LoggerService,
  ) {}

  async check(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      await this.jsm.streams.info('events')
      
      const duration = Date.now() - startTime
      
      this.logger.logInfo('NATS health check passed', { duration })
      
      return {
        name: 'nats',
        status: 'ok',
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      this.logger.logError('NATS health check failed', { 
        error: error.message,
        duration 
      })
      
      return {
        name: 'nats',
        status: 'error',
        message: error.message,
        duration
      }
    }
  }
}
