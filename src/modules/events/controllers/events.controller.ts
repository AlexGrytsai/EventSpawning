import { Controller, Post, Body, Headers, UseFilters } from '@nestjs/common'
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
      return [{ success: false, error: 'Service is shutting down' }]
    }
    const parsed = EventArraySchema.safeParse(eventPayloads)
    if (!parsed.success) {
      this.metrics.incrementFailed('validation_failed')
      return [{ success: false, error: parsed.error }]
    }
    const results: { success: boolean; error?: any }[] = []
    for (const event of parsed.data) {
      try {
        await this.eventStorage.add(event)
        this.metrics.incrementAccepted(event.source, event.funnelStage, event.eventType)
        results.push({ success: true })
      } catch (error: any) {
        this.metrics.incrementFailed('storage_failed')
        this.logger.logError(error?.message || error)
        results.push({ success: false, error: error?.message || error })
      }
    }
    this.logger.logInfo('Webhook batch processed', { count: results.length })
    return results
  }
} 