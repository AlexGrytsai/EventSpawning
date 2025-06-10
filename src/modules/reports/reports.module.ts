import { Module } from '@nestjs/common'
import { ReportsController } from './controllers/reports.controller'
import { ReportsService } from './services/reports.service'
import { MetricsModule } from '../metrics/metrics.module'
import { LoggerModule } from '../../common/services/logger.module'
import { NatsModule } from '../nats/nats.module'

@Module({
  imports: [LoggerModule, MetricsModule, NatsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {} 