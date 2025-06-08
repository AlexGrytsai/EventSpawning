import { Module } from '@nestjs/common'
import { HealthController } from './controllers/health.controller'
import { HealthService } from './services/health.service'
import { LoggerService } from '../../common/services/logger.service'
import { PostgresHealthIndicator } from './indicators/postgres.health-indicator'
import { PrismaService } from '../../common/services/prisma.service'
import { NatsHealthIndicator } from './indicators/nats.health-indicator'
import { NatsService } from '../nats/services/nats.service'
import { ConfigService } from '../../common/services/config.service'
import { LoggerModule } from '../../common/services/logger.module'

@Module({
  imports: [NatsService, LoggerModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    NatsHealthIndicator,
    PostgresHealthIndicator,
    PrismaService,
    ConfigService,
  ],
  exports: [HealthService],
})
export class HealthModule {}
