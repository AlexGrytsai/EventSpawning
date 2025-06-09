import { Injectable, OnModuleInit, Inject } from '@nestjs/common'
import { JetStreamManager, RetentionPolicy, DiscardPolicy, StorageType } from 'nats'
import { ConfigService } from '../../../common/services/config.service'

@Injectable()
export class NatsStreamInitializer implements OnModuleInit {
  constructor(
    @Inject('NATS_JSM') private readonly jsm: JetStreamManager,
    private readonly config: ConfigService
  ) {}

  async onModuleInit() {
    const streams = [
      {
        name: 'gateway',
        subjects: ['gateway.events.*']
      },
      {
        name: 'facebook',
        subjects: ['facebook.events.*']
      },
      {
        name: 'tiktok',
        subjects: ['tiktok.events.*']
      }
    ]
    for (const stream of streams) {
      try {
        await this.jsm.streams.info(stream.name)
      } catch {
        await this.jsm.streams.add({
          name: stream.name,
          subjects: stream.subjects,
          retention: RetentionPolicy.Limits,
          max_msgs_per_subject: 1000000,
          max_msgs: 10000000,
          max_bytes: 10 * 1024 * 1024 * 1024,
          discard: DiscardPolicy.Old,
          max_age: 86400 * 1000,
          storage: StorageType.File,
          num_replicas: 1,
          duplicate_window: 120 * 1000,
          deny_delete: false,
          allow_direct: true
        })
      }
    }
  }
} 