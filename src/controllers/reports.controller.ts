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
    const end = this.metrics.startTimer('reports_revenue_duration_seconds')
    this.metrics.increment('reports_revenue_requests_total')
    try {
      const filters = RevenueReportFilterSchema.parse(query)
      const result = await this.reportsService.getRevenueReport(filters, corrId)
      this.logger.logInfo('Revenue report generated', { correlationId: corrId })
      end()
      return result
    } catch (error) {
      this.metrics.increment('reports_revenue_failed_total')
      this.logger.logError('Revenue report error', { correlationId: corrId, error: error.message })
      end()
      throw new HttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message
      }, HttpStatus.BAD_REQUEST)
    }
  }
} 