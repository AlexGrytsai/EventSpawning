import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HealthService } from './health/health.service'
import { MetricsService } from './modules/metrics/metrics.service'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    await app.listen(process.env.PORT || 3000)

    const healthService = app.get(HealthService)
    const metricsService = app.get(MetricsService)
    let eventsService: any = null
    try {
      eventsService = app.get(require('./modules/events/event.service').EventsService)
    } catch (err) {
      metricsService.incrementFailed('EventsServiceNotAvailable')
    }

    const shutdown = async () => {
      healthService.setReadiness(false)
      if (eventsService && eventsService.awaitAllTasksDone) {
        await eventsService.awaitAllTasksDone()
      }
      await app.close()
      process.exit(0)
    }
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
}

bootstrap() 