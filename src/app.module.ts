import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MetricsModule } from './modules/metrics/metrics.module'
import { HealthModule } from './modules/health/health.module'
import { CorrelationIdService } from './common/services/correlation-id.service'
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor'
import { APP_INTERCEPTOR } from '@nestjs/core'

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
    providers: [
        CorrelationIdService,
        {
            provide: APP_INTERCEPTOR,
            useClass: CorrelationIdInterceptor,
        },
    ],
})
export class AppModule {}