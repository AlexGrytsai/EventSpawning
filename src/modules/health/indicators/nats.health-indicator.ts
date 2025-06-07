import { Injectable, Inject } from '@nestjs/common'
import { JetStreamClient, JetStreamManager } from 'nats'
import { HealthCheck } from '../services/health.service'
import { LoggerService } from '../../../common/services/logger.service'

@Injectable()
export class NatsHealthIndicator {
  /**
   * Constructor for NatsHealthIndicator.
   *
   * @param js - The JetStream client, injected by NestJS.
   * @param jsm - The JetStream manager, injected by NestJS.
   * @param logger - The LoggerService instance, injected by NestJS.
   */
  constructor(
    @Inject('NATS_JS') private readonly js: JetStreamClient,
    @Inject('NATS_JSM') private readonly jsm: JetStreamManager,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Performs a health check for the NATS JetStream by querying stream information.
   * Logs the duration of the health check and returns the health status.
   *
   * @returns A promise that resolves to a HealthCheck object indicating the status of the NATS service.
   *          If the check is successful, the status is 'ok'. If it fails, the status is 'error'
   *          with an accompanying error message.
   */
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
