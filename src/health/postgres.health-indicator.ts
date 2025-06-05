import { Injectable } from '@nestjs/common'
import { PrismaService } from '../services/prisma.service'
import { HealthCheck } from './health.service'
import { LoggerService } from '../services/logger.service'

@Injectable()
export class PostgresHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async check(): Promise<HealthCheck> {
    const startTime = Date.now()
    try {
      await this.prisma.$queryRaw`SELECT 1`
      const duration = Date.now() - startTime
      this.logger.logInfo('Postgres health check passed', { duration })
      return {
        name: 'postgres',
        status: 'ok',
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.logger.logError('Postgres health check failed', {
        error: error.message,
        duration
      })
      return {
        name: 'postgres',
        status: 'error',
        message: error.message,
        duration
      }
    }
  }
} 