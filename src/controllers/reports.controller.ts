import { Controller, Get, Query, Headers, UseFilters, HttpException, HttpStatus } from '@nestjs/common'
import { ReportsService } from '../modules/reports/reports.service'
import { RevenueReportFilterDto, RevenueReportFilterSchema } from '../reporter/dto/revenue-report-filter.dto'
import { EventsReportFilterDto } from '../modules/reports/events-report-filter.dto'
import { DemographicsReportFilterSchema } from '../reporter/dto/demographics-report-filter.dto'
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
  /**
   * Generate a revenue report, given a set of filters.
   *
   * This endpoint requires a set of filters to be specified in the query
   * parameter. The filters are parsed using the `RevenueReportFilterSchema`.
   *
   * If a `x-correlation-id` header is specified, it will be used to log the
   * result of the report generation. If not, a UUID will be generated.
   *
   * The report will be logged with the `logInfo` method of the logger, and the
   * processing time will be observed with the `observeProcessingTime` method of
   * the metrics service.
   *
   * If an error occurs during report generation, it will be logged with the
   * `logError` method of the logger, and the processing time will be observed
   * with the `observeProcessingTime` method of the metrics service. The error
   * will be thrown as an `HttpException` with a status code of 400.
   * @param query The filters to apply to the report.
   * @param correlationId The correlation ID to use for logging.
   */
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

  @Get('events')
  async getEventsReport(
    @Query() query: any,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    const corrId = correlationId || uuidv4()
    const startTime = Date.now()
    try {
      const filter = EventsReportFilterDto.parse(query)
      const result = await this.reportsService.getEventsReport(filter)
      this.logger.logInfo('Events report generated', { correlationId: corrId })
      this.metrics.observeProcessingTime(Date.now() - startTime)
      return result
    } catch (error) {
      this.metrics.incrementFailed(error.message)
      this.logger.logError('Events report error', { correlationId: corrId, error: error.message })
      this.metrics.observeProcessingTime(Date.now() - startTime)
      throw new HttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message
      }, HttpStatus.BAD_REQUEST)
    }
  }

  @Get('demographics')
  async getDemographicsReport(
    @Query() query: any,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    const corrId = correlationId || uuidv4()
    const startTime = Date.now()
    try {
      const filter = DemographicsReportFilterSchema.parse(query)
      const result = await this.reportsService.getDemographicsReport(filter, corrId)
      this.logger.logInfo('Demographics report generated', { correlationId: corrId })
      this.metrics.observeProcessingTime(Date.now() - startTime)
      return result
    } catch (error) {
      this.metrics.incrementFailed(error.message)
      this.logger.logError('Demographics report error', { correlationId: corrId, error: error.message })
      this.metrics.observeProcessingTime(Date.now() - startTime)
      throw new HttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message
      }, HttpStatus.BAD_REQUEST)
    }
  }
} 