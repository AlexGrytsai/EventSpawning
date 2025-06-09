import { Module } from '@nestjs/common'
import { LoggerService } from './logger.service'
import { ConfigService } from './config.service'
import { CorrelationIdService } from './correlation-id.service'

@Module({
  providers: [LoggerService, ConfigService, CorrelationIdService],
  exports: [LoggerService, ConfigService, CorrelationIdService],
})
export class LoggerModule {} 