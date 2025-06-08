import { Module } from '@nestjs/common'
import { ConfigService } from '../../common/services/config.service'
import { NatsPublisher } from './services/nats.publisher'
import { connect } from 'nats'
import { LoggerModule } from '../../common/services/logger.module'
import { MetricsModule } from '../metrics/metrics.module'

@Module({
  imports: [LoggerModule, MetricsModule],
  providers: [
    NatsPublisher,
    ConfigService,
    {
      provide: 'NATS_JS',
      /**
       * A factory function that connects to a NATS server and sets up a JetStream client.
       * The `NATS_URL` environment variable is used to determine the URL to connect to, and
       * defaults to `nats://localhost:4222` if not set.
       *
       * The `reconnect` option is set to true, and the `maxReconnectAttempts` is set to -1
       * to indicate that the client should reconnect indefinitely. The `reconnectTimeWait`
       * is set to 2000 milliseconds.
       *
       * The function returns a promise that resolves with a JetStream client.
       *
       * @param config - a ConfigService instance, injected by NestJS.
       */
      useFactory: async (config: ConfigService) => {
        const natsUrl = config.get('NATS_URL') ?? 'nats://localhost:4222'
        const nc = await connect({
          servers: [natsUrl],
          reconnect: true,
          maxReconnectAttempts: -1,
          reconnectTimeWait: 2000,
        })
        return nc.jetstream()
      },
      inject: [ConfigService],
    },
    {
      provide: 'NATS_JSM',
      useFactory: async (config: ConfigService) => {
        const natsUrl = config.get('NATS_URL') ?? 'nats://localhost:4222'
        const nc = await connect({
          servers: [natsUrl],
          reconnect: true,
          maxReconnectAttempts: -1,
          reconnectTimeWait: 2000,
        })
        return nc.jetstreamManager()
      },
      inject: [ConfigService],
    },
  ],
  exports: ['NATS_JS', 'NATS_JSM', NatsPublisher],
})
export class NatsModule {}