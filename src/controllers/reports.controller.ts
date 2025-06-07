import { Controller, Get, Query, Headers, UseFilters, HttpException, HttpStatus } from '@nestjs/common'
import { ReportsService } from '../modules/reports/reports.service'
import { RevenueReportFilterDto, RevenueReportFilterSchema } from '../reporter/dto/revenue-report-filter.dto'
import { LoggerService } from '../services/logger.service'
import { MetricsService } from '../modules/metrics/metrics.service'
import { HttpExceptionFilter } from './http-exception.filter'
import { v4 as uuidv4 } from 'uuid'

@Controller('reports')
@UseFilters(HttpExceptionFilter)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService
  ) {}

  @Get('revenue')
  async getRevenueReport(
    @Query() query: RevenueReportFilterDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    const corrId = correlationId || uuidv4()
    const startTime = Date.now()
    try {
      const filters = RevenueReportFilterSchema.parse(query)
      const result = await this.reportsService.getRevenueReport(filters)
      this.logger.logInfo('Revenue report generated', { correlationId: corrId })
      this.metrics.observeProcessingTime(Date.now() - startTime)
      return result
    } catch (error) {
      this.metrics.incrementFailed(error.message)
      this.logger.logError('Revenue report error', { correlationId: corrId, error: error.message })
      this.metrics.observeProcessingTime(Date.now() - startTime)
      throw new HttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message
      }, HttpStatus.BAD_REQUEST)
    }
  }
} 