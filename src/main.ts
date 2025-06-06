import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ShutdownService } from './services/shutdown.service'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    await app.listen(process.env.PORT || 3000)

    const shutdownService = app.get(ShutdownService)

    const shutdown = async () => {
      await shutdownService.shutdown()
      await app.close()
      process.exit(0)
    }
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
}

bootstrap() 