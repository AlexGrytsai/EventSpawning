import { Injectable } from '@nestjs/common'
import { NatsHealthIndicator } from '../indicators/nats.health-indicator'
import { PostgresHealthIndicator } from '../indicators/postgres.health-indicator'
import { LoggerService } from '../../../common/services/logger.service'
import { ConfigService } from '../../../common/services/config.service'

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
  /**
   * The health indicators available. Each key is the name of the
   * dependency (e.g. "nats" or "postgres"), and the value is an
   * object with a `check` method that returns a Promise resolving to a
   * `HealthCheck` object.
   */
  private readonly indicators: Record<string, { check(): Promise<HealthCheck> }>
  private isShuttingDown = false
  private isReady = true

  /**
   * The constructor for the HealthService.
   *
   * @param natsHealthIndicator The health indicator for NATS
   * @param postgresHealthIndicator The health indicator for Postgres
   * @param logger The logger service
   * @param config The configuration service
   */
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

  /**
   * Sets the readiness state of the application.
   *
   * @param isReady - A boolean indicating if the application is ready.
   *                  If false, the application is marked as shutting down.
   */
  setReadiness(isReady: boolean) {
    this.isReady = isReady
    if (!isReady) {
      this.isShuttingDown = true
    }
  }

  /**
   * Indicates whether the application is currently shutting down.
   *
   * @returns true if the application is shutting down, false otherwise.
   */
  isShuttingDownNow() {
    return this.isShuttingDown
  }

  /**
   * Always returns true. The purpose of this method is to allow the liveness probe
   * to check if the application is running and responding to requests.
   * @returns true
   */
  async checkLiveness(): Promise<boolean> {
    return true
  }

  /**
   * Runs the readiness checks for all registered dependencies.
   *
   * The readiness checks are used to determine if the application is ready
   * to receive traffic. The readiness checks are run in parallel and the
   * result is a single object indicating whether the application is ready
   * and the results of the individual checks.
   *
   * If any of the checks fail, the application is marked as not ready.
   *
   * @returns An object with a boolean `isReady` property and an array of
   *          `HealthCheck` objects containing the results of the individual
   *          checks.
   */
  async checkReadiness(): Promise<ReadinessResult> {
    if (!this.isReady) {
      return { isReady: false, checks: [] }
    }
    const checks: HealthCheck[] = []
    let isReady = true

    for (const dep of this.dependencies) {
      const indicator = this.indicators[dep]
      if (!indicator) {
        this.logger.logInfo('[HealthService] Unknown health dependency is not recognized in indicators. Please check HEALTH_DEPENDENCIES configuration.', { dependency: dep })
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
