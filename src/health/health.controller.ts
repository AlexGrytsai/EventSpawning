import { Controller, Get, HttpStatus, Res } from '@nestjs/common'
import { Response } from 'express'
import { HealthService } from './health.service'
import { ConfigService } from '../services/config.service'

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get the name of the service from the configuration, or 'service' if not set
   * @returns The name of the service
   */
  private getServiceName(): string {
    return this.config.get('SERVICE_NAME') || 'service'
  }

  @Get('liveness')
  /**
   * Handles the liveness check endpoint.
   * Responds with a 200 status and service information if the service is live,
   * otherwise responds with a 503 status.
   *
   * @param res - The response object from Express.
   */
  async liveness(@Res() res: Response) {
    const isLive = await this.healthService.checkLiveness()
    const service = this.getServiceName()
    if (isLive) {
      res.status(HttpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service
      })
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service
      })
    }
  }

  @Get('readiness')
  /**
   * Handles the readiness check endpoint.
   * Responds with a 200 status and readiness information if the service is ready,
   * otherwise responds with a 503 status.
   *
   * @param res - The response object from Express.
   */
  async readiness(@Res() res: Response) {
    const readinessResult = await this.healthService.checkReadiness()
    const service = this.getServiceName()
    if (readinessResult.isReady) {
      res.status(HttpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service,
        checks: readinessResult.checks
      })
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service,
        checks: readinessResult.checks
      })
    }
  }

  @Get('live')
  async live(@Res() res: Response) {
    return this.liveness(res)
  }

  @Get('ready')
  async ready(@Res() res: Response) {
    return this.readiness(res)
  }
}
