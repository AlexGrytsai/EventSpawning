import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MetricsModule } from './modules/metrics/metrics.module'
import { HealthModule } from './health/health.module'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.SERVICE_ENV ? `.env.${process.env.SERVICE_ENV}` : '.env',
            expandVariables: true,
            cache: true,
        }),
        MetricsModule,
        HealthModule,
    ],
})
export class AppModule {}