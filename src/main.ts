import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ShutdownService } from './common/services/shutdown.service'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    const server = app.getHttpAdapter().getInstance()
    await app.listen(process.env.PORT || 3000)

    const shutdownService = app.get(ShutdownService)

    const shutdown = async () => {
      await shutdownService.shutdown()
      server.close(() => {
        process.exit(0)
      })
    }
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
}

bootstrap() 