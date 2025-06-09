import { Controller, Get, Query, Headers, UseFilters, HttpException, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiHeader, ApiPropertyOptional } from '@nestjs/swagger'
import { ReportsService } from '../services/reports.service'
import { RevenueReportFilterDto, RevenueReportFilterSchema } from '../../../common/dto/revenue-report-filter.dto'
import { EventsReportFilterDto as EventsReportFilterZod } from '../dto/events-report-filter.dto'
import { DemographicsReportFilterSchema } from '../../../common/dto/demographics-report-filter.dto'
import { LoggerService } from '../../../common/services/logger.service'
import { MetricsService } from '../../metrics/services/metrics.service'
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter'
import { v4 as uuidv4 } from 'uuid'
import { DemographicsReportFilterDto } from '../dto/demographics-report-filter.dto'
import { IsOptional, IsString, IsEnum } from 'class-validator'

class EventsReportFilterDtoSwagger {
  @ApiPropertyOptional({ description: 'Start date', type: String, format: 'date-time', example: '2023-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  from?: string

  @ApiPropertyOptional({ description: 'End date', type: String, format: 'date-time', example: '2023-01-31T23:59:59.999Z' })
  @IsOptional()
  @IsString()
  to?: string

  @ApiPropertyOptional({ description: 'Source', enum: ['facebook', 'tiktok'], example: 'facebook' })
  @IsOptional()
  @IsEnum(['facebook', 'tiktok'])
  source?: 'facebook' | 'tiktok'

  @ApiPropertyOptional({ description: 'Funnel stage', enum: ['top', 'bottom'], example: 'top' })
  @IsOptional()
  @IsEnum(['top', 'bottom'])
  funnelStage?: 'top' | 'bottom'

  @ApiPropertyOptional({ description: 'Event type', type: String, example: 'click' })
  @IsOptional()
  @IsString()
  eventType?: string

  @ApiPropertyOptional({ description: 'Campaign ID', type: String, example: 'cmp_123' })
  @IsOptional()
  @IsString()
  campaignId?: string

  @ApiPropertyOptional({ description: 'User ID', type: String, example: 'user_456' })
  @IsOptional()
  @IsString()
  userId?: string
}

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
  @ApiQuery({ required: false, description: 'Revenue report filters', type: RevenueReportFilterDto })
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
  @ApiQuery({ required: false, description: 'Events report filters', type: EventsReportFilterDtoSwagger })
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
      const filter = EventsReportFilterZod.parse(query)
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
  @ApiQuery({ name: 'filters', required: false, description: 'Demographics report filters', type: DemographicsReportFilterDto })
  @ApiHeader({ name: 'x-correlation-id', required: false, description: 'Correlation ID for the report' })
  @ApiResponse({ status: 200, description: 'Demographics report generated', schema: { type: 'object' } })
  @ApiResponse({ status: 400, description: 'Invalid filters or error' })
  async getDemographicsReport(
    @Query() query: DemographicsReportFilterDto,
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