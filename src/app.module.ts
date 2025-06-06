import { Module } from '@nestjs/common'
import { MetricsModule } from './modules/metrics/metrics.module'
import { HealthModule } from './health/health.module'

@Module({
    imports: [MetricsModule, HealthModule],
})
export class AppModule {}