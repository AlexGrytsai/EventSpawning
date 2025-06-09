import { Controller, Post, Body, Headers, UseFilters, HttpException, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger'
import { EventsService } from '../services/event.service'
import { LoggerService } from '../../../common/services/logger.service'
import { MetricsService } from '../../metrics/services/metrics.service'
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter'
import { HealthService } from '../../health/services/health.service'
import { EventArraySchema } from '../dto/event.zod'
import { EventStorageService } from '../services/event-storage.service'

@ApiTags('Events')
@Controller('events')
@UseFilters(HttpExceptionFilter)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
    private readonly healthService: HealthService,
    private readonly eventStorage: EventStorageService
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
      throw new HttpException('Service is shutting down', HttpStatus.SERVICE_UNAVAILABLE)
    }
    return this.eventsService.processEventsBatch(eventPayloads, correlationId)
  }
} 