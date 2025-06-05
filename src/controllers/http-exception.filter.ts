import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private static readonly logger = new Logger('HttpExceptionFilter')

  /**
   * Handle any exceptions that occur in the application.
   *
   * If the exception is an instance of `HttpException`, it will be handled
   * according to the HTTP status code and response body defined in the exception.
   *
   * If the exception is not an instance of `HttpException`, it will be handled
   * as an internal server error, and a JSON response with a status code of
   * 500 will be returned.
   *
   * @param exception The exception that occurred.
   * @param host The ArgumentsHost that contains the request and response objects.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const responseBody = exception.getResponse() as any
      
      if (status === HttpStatus.BAD_REQUEST) {
        return response.status(status).json({
          statusCode: status,
          message: responseBody.message || exception.message,
          details: responseBody.details || null
        })
      }
      
      return response.status(status).json({
        statusCode: status,
        message: responseBody.message || exception.message
      })
    }
    
    HttpExceptionFilter.logger.error(
      'Unhandled exception caught in HttpExceptionFilter',
      exception instanceof Error ? exception.stack : JSON.stringify(exception)
    )
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error'
    })
  }
} 