import { Module } from '@nestjs/common'
import { ConfigService } from '../../services/config.service'
import { NatsPublisher } from './nats.publisher'
import { connect } from 'nats'

@Module({
  providers: [
    NatsPublisher,
    ConfigService,
    {
      provide: 'NATS_JS',
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
  ],
  exports: ['NATS_JS', NatsPublisher],
})
export class NatsService {}