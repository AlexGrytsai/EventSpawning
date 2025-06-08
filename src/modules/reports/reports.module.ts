import { Module } from '@nestjs/common'
import { ReportsController } from './controllers/reports.controller'
import { ReportsService } from './services/reports.service'
import { PrismaService } from '../../common/services/prisma.service'
import { LoggerModule } from '../../common/services/logger.module'
import { MetricsService } from '../metrics/services/metrics.service'

@Module({
  imports: [LoggerModule],
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService, MetricsService],
})
export class ReportsModule {} 