import { Module } from '@nestjs/common'
import { HealthController } from './controllers/health.controller'
import { HealthService } from './services/health.service'
import { LoggerService } from '../../services/logger.service'
import { PostgresHealthIndicator } from './indicators/postgres.health-indicator'
import { PrismaService } from '../../services/prisma.service'
import { NatsHealthIndicator } from './indicators/nats.health-indicator'
import { NatsService } from '../nats/services/nats.service'
import { ConfigService } from '../../services/config.service'

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
