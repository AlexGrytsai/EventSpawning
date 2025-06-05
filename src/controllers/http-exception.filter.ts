import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    if (exception.status === 400) {
      response.status(400).json({
        statusCode: 400,
        message: exception.message,
        details: exception.details || null
      })
      return
    }
    response.status(500).json({
      statusCode: 500,
      message: 'Internal server error'
    })
  }
} 