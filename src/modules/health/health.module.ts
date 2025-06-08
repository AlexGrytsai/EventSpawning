import { Module } from '@nestjs/common'
import { HealthController } from './controllers/health.controller'
import { HealthService } from './services/health.service'
import { PostgresHealthIndicator } from './indicators/postgres.health-indicator'
import { NatsHealthIndicator } from './indicators/nats.health-indicator'
import { NatsModule } from '../nats/nats.module'
import { ConfigService } from '../../common/services/config.service'
import { LoggerModule } from '../../common/services/logger.module'
import { PrismaModule } from '../../common/services/prisma.module'

@Module({
  imports: [NatsModule, LoggerModule, PrismaModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    NatsHealthIndicator,
    PostgresHealthIndicator,
    ConfigService,
  ],
  exports: [HealthService],
})
export class HealthModule {}
