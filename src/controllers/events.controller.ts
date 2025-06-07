import { Controller, Post, Body, Headers, UseFilters, HttpStatus, HttpException, BadRequestException } from '@nestjs/common'
import { EventsService } from '../modules/events/event.service'
import { LoggerService } from '../services/logger.service'
import { MetricsService } from '../modules/metrics/metrics.service'
import { HttpExceptionFilter } from './http-exception.filter'
import { v4 as uuidv4 } from 'uuid'
import { HealthService } from '../health/health.service'

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
  /**
   * Handles a webhook event.
   *
   * @param eventPayload - The JSON payload of the webhook event.
   * @param correlationId - The correlation ID for the webhook event, if provided.
   *
   * @returns A promise that resolves with the result of processing the webhook event.
   *
   * @throws {BadRequestException} If the webhook event is invalid.
   * @throws {HttpException} If an internal error occurs while processing the webhook event.
   */
  async handleWebhook(
    @Body() eventPayload: unknown,
    @Headers('x-correlation-id') correlationId?: string
  ): Promise<any> {
    if (this.healthService.isShuttingDownNow()) {
      throw new HttpException({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Service is shutting down'
      }, HttpStatus.SERVICE_UNAVAILABLE)
    }
    const corrId = correlationId || uuidv4()
    try {
      const result = await this.eventsService.processEvent(eventPayload, corrId)
      this.logger.logInfo('Webhook processed successfully', { correlationId: result.correlationId })
      return result
    } catch (error) {
      // Only increment metrics for non-validation errors (validation errors are already tracked in the service)
      const isNatsPublishError =
        error instanceof HttpException &&
        error.message === 'Failed to publish event to NATS'
      if (!(error instanceof BadRequestException) && !isNatsPublishError) {
        this.metrics.incrementFailed(error.message || 'Unknown error')
      }
      
      this.logger.logError('Webhook processing failed', {
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