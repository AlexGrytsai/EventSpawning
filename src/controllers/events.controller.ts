import { Controller, Post, Body, Headers, UseFilters, HttpStatus, HttpException, BadRequestException } from '@nestjs/common'
import { EventsService } from '../modules/events/event.service'
import { LoggerService } from '../services/logger.service'
import { MetricsModule } from '../modules/metrics/metrics.module'
import { HttpExceptionFilter } from './http-exception.filter'

@Controller('events')
@UseFilters(HttpExceptionFilter)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsModule
  ) {}

  @Post()
  async handleWebhook(
    @Body() eventPayload: unknown,
    @Headers('x-correlation-id') correlationId?: string
  ): Promise<any> {
    try {
      const result = await this.eventsService.processEvent(eventPayload, correlationId)
      this.logger.logInfo('Webhook processed successfully', { correlationId: result.correlationId })
      return result
    } catch (error) {
      // Only increment metrics for non-validation errors (validation errors are already tracked in the service)
      if (!(error instanceof BadRequestException)) {
        this.metrics.incrementFailed(error.message || 'Unknown error')
      }
      
      this.logger.logError('Webhook processing failed', {
        correlationId: correlationId || 'unknown',
        error: error.message || 'Unknown error'
      })
      
      if (error.status === 400) {
        throw new HttpException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          details: error.details || null
        }, HttpStatus.BAD_REQUEST)
      }
      throw new HttpException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      }, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
} 