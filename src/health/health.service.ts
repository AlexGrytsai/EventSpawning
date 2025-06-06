import { Injectable } from '@nestjs/common'
import { NatsHealthIndicator } from './nats.health-indicator'
import { PostgresHealthIndicator } from './postgres.health-indicator'
import { LoggerService } from '../services/logger.service'
import { ConfigService } from '../services/config.service'

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
  private readonly dependencies: string[]
  private isShuttingDown = false
  private isReady = true

  constructor(
    private readonly natsHealthIndicator: NatsHealthIndicator,
    private readonly postgresHealthIndicator: PostgresHealthIndicator,
    private readonly logger: LoggerService,
    private readonly config: ConfigService,
  ) {
    // HEALTH_DEPENDENCIES=nats,postgres
    const deps = this.config.get('HEALTH_DEPENDENCIES')
    this.dependencies = deps ? deps.split(',').map(d => d.trim().toLowerCase()) : ['postgres']
  }

  setReadiness(isReady: boolean) {
    this.isReady = isReady
    if (!isReady) this.isShuttingDown = true
  }

  isShuttingDownNow() {
    return this.isShuttingDown
  }

  async checkLiveness(): Promise<boolean> {
    try {
      return true
    } catch (error) {
      this.logger.logError('Liveness check failed', { error: error.message })
      return false
    }
  }

  async checkReadiness(): Promise<ReadinessResult> {
    if (!this.isReady) {
      return { isReady: false, checks: [] }
    }
    const checks: HealthCheck[] = []
    let isReady = true

    for (const dep of this.dependencies) {
      if (dep === 'nats') {
        try {
          const natsCheck = await this.natsHealthIndicator.check()
          checks.push(natsCheck)
          if (natsCheck.status === 'error') isReady = false
        } catch (error) {
          this.logger.logError('Readiness check failed', { error: error.message })
          checks.push({
            name: 'nats',
            status: 'error',
            message: error.message
          })
          isReady = false
        }
      }
      if (dep === 'postgres') {
        try {
          const postgresCheck = await this.postgresHealthIndicator.check()
          checks.push(postgresCheck)
          if (postgresCheck.status === 'error') isReady = false
        } catch (error) {
          this.logger.logError('Readiness check failed', { error: error.message })
          checks.push({
            name: 'postgres',
            status: 'error',
            message: error.message
          })
          isReady = false
        }
      }
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
