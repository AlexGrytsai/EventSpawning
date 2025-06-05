import { Injectable } from '@nestjs/common'
import { NatsHealthIndicator } from './nats.health-indicator'
import { PostgresHealthIndicator } from './postgres.health-indicator'
import { LoggerService } from '../services/logger.service'

export interface HealthCheck {
  name: string
  status: 'ok' | 'error'
  message?: string
  duration?: number
}

export interface ReadinessResult {
  isReady: boolean
  checks: HealthCheck[]
}

@Injectable()
export class HealthService {
  constructor(
    private readonly natsHealthIndicator: NatsHealthIndicator,
    private readonly postgresHealthIndicator: PostgresHealthIndicator,
    private readonly logger: LoggerService,
  ) {}

  async checkLiveness(): Promise<boolean> {
    try {
      return true
    } catch (error) {
      this.logger.logError('Liveness check failed', { error: error.message })
      return false
    }
  }

  async checkReadiness(): Promise<ReadinessResult> {
    const checks: HealthCheck[] = []
    let isReady = true

    try {
      const natsCheck = await this.natsHealthIndicator.check()
      checks.push(natsCheck)
      
      if (natsCheck.status === 'error') {
        isReady = false
      }
    } catch (error) {
      this.logger.logError('Readiness check failed', { error: error.message })
      checks.push({
        name: 'nats',
        status: 'error',
        message: error.message
      })
      isReady = false
    }

    try {
      const postgresCheck = await this.postgresHealthIndicator.check()
      checks.push(postgresCheck)
      if (postgresCheck.status === 'error') {
        isReady = false
      }
    } catch (error) {
      this.logger.logError('Readiness check failed', { error: error.message })
      checks.push({
        name: 'postgres',
        status: 'error',
        message: error.message
      })
      isReady = false
    }

    this.logger.logInfo('Readiness check completed', { 
      isReady, 
      checksCount: checks.length 
    })

    return {
      isReady,
      checks
    }
  }
}
