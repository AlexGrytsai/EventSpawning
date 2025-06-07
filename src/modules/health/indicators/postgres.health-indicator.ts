import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../common/services/prisma.service'
import { HealthCheck } from '../services/health.service'
import { LoggerService } from '../../../common/services/logger.service'

@Injectable()
export class PostgresHealthIndicator {
  /**
   * The constructor for the PostgresHealthIndicator.
   *
   * @param prisma The PrismaService instance for performing database queries.
   * @param logger The LoggerService instance for logging messages and errors.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Performs a health check for the Postgres database by performing a simple query.
   * Logs the duration of the health check and returns the health status.
   *
   * @returns A promise that resolves to a HealthCheck object indicating the status of the Postgres service.
   *          If the check is successful, the status is 'ok'. If it fails, the status is 'error'
   *          with an accompanying error message.
   */
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