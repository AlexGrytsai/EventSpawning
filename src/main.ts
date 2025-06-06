import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    await app.listen(process.env.PORT || 3000)

    const healthService = app.get(require('./health/health.service').HealthService)
    let eventsService: any = null
    try {
      eventsService = app.get(require('./modules/events/event.service').EventsService)
    } catch {}

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