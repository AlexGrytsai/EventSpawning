import { Controller, Post, Body, Headers, UseFilters, HttpStatus, HttpException, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger'
import { EventsService } from '../services/event.service'
import { LoggerService } from '../../../common/services/logger.service'
import { MetricsService } from '../../metrics/services/metrics.service'
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter'
import { v4 as uuidv4 } from 'uuid'
import { HealthService } from '../../health/services/health.service'
import { EventArraySchema } from '../dto/event.zod'

@ApiTags('Events')
@Controller('events')
@UseFilters(HttpExceptionFilter)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
    private readonly healthService: HealthService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Handle webhook events', description: 'Processes a batch of webhook events and returns the result.' })
  @ApiBody({ description: 'Array of webhook event payloads', isArray: true, type: Object, required: true })
  @ApiHeader({ name: 'x-correlation-id', required: false, description: 'Correlation ID for the webhook events' })
  @ApiResponse({ status: 200, description: 'Events processed successfully', schema: { type: 'array', items: { type: 'object' } } })
  @ApiResponse({ status: 400, description: 'Invalid webhook events' })
  @ApiResponse({ status: 503, description: 'Service is shutting down' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleWebhook(
    @Body() eventPayloads: unknown[],
    @Headers('x-correlation-id') correlationId?: string
  ): Promise<any> {
    if (this.healthService.isShuttingDownNow()) {
      throw new HttpException({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Service is shutting down'
      }, HttpStatus.SERVICE_UNAVAILABLE)
    }
    const corrId = correlationId || uuidv4()
    const parsed = EventArraySchema.safeParse(eventPayloads)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error)
    }
    try {
      const result = await this.eventsService.processEvents(parsed.data, corrId)
      this.logger.logInfo('Webhook batch processed', { correlationId: corrId })
      return result
    } catch (error) {
      const isNatsPublishError =
        error instanceof HttpException &&
        error.message === 'Failed to publish event to NATS'
      if (!(error instanceof BadRequestException) && !isNatsPublishError) {
        this.metrics.incrementFailed(error.message || 'Unknown error')
      }
      this.logger.logError('Webhook batch processing failed', {
        correlationId: corrId,
        error: error.message || 'Unknown error'
      })
      if (error.status === 400) {
        const response = typeof error.getResponse === 'function' ? error.getResponse() : {}
        const details = response && typeof response === 'object' && 'details' in response ? response.details : null
        throw new HttpException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          details
        }, HttpStatus.BAD_REQUEST)
      }
      throw new HttpException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      }, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
} 