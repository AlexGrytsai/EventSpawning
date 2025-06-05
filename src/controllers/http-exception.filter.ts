import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
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
    
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error'
    })
  }
} 