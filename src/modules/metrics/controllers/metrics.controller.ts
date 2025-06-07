import { Controller, Get, Header } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { MetricsService } from '../services/metrics.service'

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @Get()
    @Header('Content-Type', 'text/plain; version=0.0.4')
    @ApiOperation({ summary: 'Get metrics', description: 'Returns all available metrics in OpenMetrics text format.' })
    @ApiResponse({ status: 200, description: 'Metrics in OpenMetrics format', schema: { type: 'string' } })
    /**
     * Get all available metrics in OpenMetrics text format.
     * @returns A promise that resolves with a string containing the metrics.
     */
    async getMetrics(): Promise<string> {
        return await this.metricsService.getMetrics()
    }
} 