import { Module } from '@nestjs/common'
import { MetricsModule } from './modules/metrics/metrics.module'

@Module({
    imports: [MetricsModule],
})
export class AppModule {} 