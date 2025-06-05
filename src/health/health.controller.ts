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

  private getServiceName(): string {
    return this.config.get('SERVICE_NAME') || 'service'
  }

  @Get('liveness')
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
}
