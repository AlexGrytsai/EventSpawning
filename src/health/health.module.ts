import { Module } from '@nestjs/common'
import { HealthController } from '../controllers/health.controller'
import { HealthService } from './health.service'
import { LoggerService } from '../services/logger.service'
import { PostgresHealthIndicator } from './postgres.health-indicator'
import { PrismaService } from '../services/prisma.service'
import { NatsHealthIndicator } from './nats.health-indicator'
import { NatsService } from '../modules/nats/nats.service'
import { ConfigService } from '../services/config.service'

@Module({
  imports: [NatsService],
  controllers: [HealthController],
  providers: [
    HealthService,
    NatsHealthIndicator,
    LoggerService,
    PostgresHealthIndicator,
    PrismaService,
    ConfigService,
  ],
  exports: [HealthService],
})
export class HealthModule {}
