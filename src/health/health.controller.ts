import { Controller, Get, HttpStatus, Res } from '@nestjs/common'
import { Response } from 'express'
import { HealthService } from './health.service'

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('liveness')
  async liveness(@Res() res: Response) {
    const isLive = await this.healthService.checkLiveness()
    
    if (isLive) {
      res.status(HttpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'gateway'
      })
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'gateway'
      })
    }
  }

  @Get('readiness')
  async readiness(@Res() res: Response) {
    const readinessResult = await this.healthService.checkReadiness()
    
    if (readinessResult.isReady) {
      res.status(HttpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'gateway',
        checks: readinessResult.checks
      })
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'gateway',
        checks: readinessResult.checks
      })
    }
  }
}
