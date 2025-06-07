import { Module } from '@nestjs/common'
import { ReportsController } from '../../controllers/reports.controller'
import { ReportsService } from './reports.service'
import { PrismaService } from '../../services/prisma.service'
import { LoggerService } from '../../services/logger.service'
import { MetricsService } from '../metrics/metrics.service'

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService, LoggerService, MetricsService],
})
export class ReportsModule {} 