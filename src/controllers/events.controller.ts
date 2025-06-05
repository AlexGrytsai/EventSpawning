import { Controller, Post, Body, Headers, UseFilters, HttpStatus, Response } from '@nestjs/common'
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
    @Headers('x-correlation-id') correlationId?: string,
    @Response() res?: any
  ): Promise<any> {
    try {
      const result = await this.eventsService.processEvent(eventPayload, correlationId)
      this.logger.logInfo('Webhook processed successfully', { correlationId: result.correlationId })
      return res.status(HttpStatus.OK).json(result)
    } catch (error) {
      this.metrics.incrementFailed(error.message || 'Unknown error')
      this.logger.logError('Webhook processing failed', { 
        correlationId: correlationId || 'unknown',
        error: error.message || 'Unknown error'
      })
      
      if (error.status === 400) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
          details: error.details || null
        })
      }
      
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      })
    }
  }
} 