import { Controller, Get, Header } from '@nestjs/common'
import { MetricsService } from './metrics.service'

@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @Get()
    @Header('Content-Type', 'text/plain; version=0.0.4')
    /**
     * Get all available metrics in OpenMetrics text format.
     * @returns A promise that resolves with a string containing the metrics.
     */
    async getMetrics(): Promise<string> {
        return await this.metricsService.getMetrics()
    }
} 