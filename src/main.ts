import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ShutdownService } from './common/services/shutdown.service'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { json, urlencoded } from 'express'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    app.use(json({ limit: '50mb' }))
    app.use(urlencoded({ limit: '50mb', extended: true }))
    const server = app.getHttpAdapter().getInstance()
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Event Spawning API')
        .setDescription('API documentation for Event Spawning service')
        .setVersion('1.0.0')
        .build()
      const document = SwaggerModule.createDocument(app, config)
      SwaggerModule.setup('api-docs', app, document)
    }
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