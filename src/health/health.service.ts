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
  private readonly indicators: Record<string, { check(): Promise<HealthCheck> }>
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
    this.indicators = {
      nats: this.natsHealthIndicator,
      postgres: this.postgresHealthIndicator,
    }
  }

  setReadiness(isReady: boolean) {
    this.isReady = isReady
    if (!isReady) {
      this.isShuttingDown = true
    }
  }

  isShuttingDownNow() {
    return this.isShuttingDown
  }

  async checkLiveness(): Promise<boolean> {
    return true
  }

  async checkReadiness(): Promise<ReadinessResult> {
    if (!this.isReady) {
      return { isReady: false, checks: [] }
    }
    const checks: HealthCheck[] = []
    let isReady = true

    for (const dep of this.dependencies) {
      const indicator = this.indicators[dep]
      if (!indicator) {
        continue
      }
      try {
        const result = await indicator.check()
        checks.push(result)
        if (result.status === 'error') {
          isReady = false
        }
      } catch (error) {
        this.logger.logError('Readiness check failed', { error: error.message })
        checks.push({ name: dep, status: 'error', message: error.message })
        isReady = false
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
