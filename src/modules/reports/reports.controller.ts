import { Controller, Get, Query } from '@nestjs/common'
import { ReportsService } from './reports.service'
import { EventsReportFilterDto } from './events-report-filter.dto'

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('events')
  async getEventsReport(@Query() query: any) {
    const filter = EventsReportFilterDto.parse(query)
    return this.reportsService.getEventsReport(filter)
  }
} 