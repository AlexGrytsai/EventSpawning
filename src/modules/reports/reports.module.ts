import { Module } from '@nestjs/common'
import { ReportsController } from './controllers/reports.controller'
import { ReportsService } from './services/reports.service'
import { PrismaService } from '../../common/services/prisma.service'
import { LoggerService } from '../../common/services/logger.service'
import { MetricsService } from '../metrics/services/metrics.service'

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService, LoggerService, MetricsService],
})
export class ReportsModule {} 