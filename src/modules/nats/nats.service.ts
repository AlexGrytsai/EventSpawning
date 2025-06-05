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
        const nc = await connect({
          servers: [config.get('NATS_URL')],
          reconnect: true,
          maxReconnects: -1,
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