import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'
import { NatsHealthIndicator } from './nats.health-indicator'
import { NatsService } from '../modules/nats/nats.service'
import { LoggerService } from '../services/logger.service'

@Module({
  imports: [NatsService],
  controllers: [HealthController],
  providers: [
    HealthService,
    NatsHealthIndicator,
    LoggerService,
  ],
  exports: [HealthService],
})
export class HealthModule {}
