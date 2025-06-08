import { Module } from '@nestjs/common'
import { ReportsController } from './controllers/reports.controller'
import { ReportsService } from './services/reports.service'
import { MetricsService } from '../metrics/services/metrics.service'
import { LoggerModule } from '../../common/services/logger.module'

@Module({
  imports: [LoggerModule],
  controllers: [ReportsController],
  providers: [ReportsService, MetricsService],
})
export class ReportsModule {} 