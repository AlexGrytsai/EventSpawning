import { Controller, Get, Query, Headers, UseFilters, HttpException, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiHeader } from '@nestjs/swagger'
import { ReportsService } from '../services/reports.service'
import { RevenueReportFilterDto, RevenueReportFilterSchema } from '../../../common/dto/revenue-report-filter.dto'
import { EventsReportFilterDto } from '../dto/events-report-filter.dto'
import { DemographicsReportFilterSchema } from '../../../common/dto/demographics-report-filter.dto'
import { LoggerService } from '../../../common/services/logger.service'
import { MetricsService } from '../../metrics/services/metrics.service'
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter'
import { v4 as uuidv4 } from 'uuid'

@ApiTags('Reports')
@Controller('reports')
@UseFilters(HttpExceptionFilter)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService
  ) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Generate revenue report', description: 'Generate a revenue report with filters.' })
  @ApiQuery({ name: 'filters', required: false, description: 'Revenue report filters', type: 'object' })
  @ApiHeader({ name: 'x-correlation-id', required: false, description: 'Correlation ID for the report' })
  @ApiResponse({ status: 200, description: 'Revenue report generated', schema: { type: 'object' } })
  @ApiResponse({ status: 400, description: 'Invalid filters or error' })
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
  @ApiOperation({ summary: 'Generate events report', description: 'Generate an events report with filters.' })
  @ApiQuery({ name: 'filters', required: false, description: 'Events report filters', type: 'object' })
  @ApiHeader({ name: 'x-correlation-id', required: false, description: 'Correlation ID for the report' })
  @ApiResponse({ status: 200, description: 'Events report generated', schema: { type: 'object' } })
  @ApiResponse({ status: 400, description: 'Invalid filters or error' })
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
  @ApiOperation({ summary: 'Generate demographics report', description: 'Generate a demographics report with filters.' })
  @ApiQuery({ name: 'filters', required: false, description: 'Demographics report filters', type: 'object' })
  @ApiHeader({ name: 'x-correlation-id', required: false, description: 'Correlation ID for the report' })
  @ApiResponse({ status: 200, description: 'Demographics report generated', schema: { type: 'object' } })
  @ApiResponse({ status: 400, description: 'Invalid filters or error' })
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