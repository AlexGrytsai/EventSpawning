import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { EventStorageService } from './event-storage.service'
import { NatsPublisher } from '../../nats/services/nats.publisher'
import { LoggerService } from '../../../common/services/logger.service'
import { MetricsService } from '../../metrics/services/metrics.service'
import { ConfigService } from '../../../common/services/config.service'
import { EventSchema } from '../dto/event.zod'

interface DispatchTask {
  event: any
  attempt: number
  nextAttempt: number
}

@Injectable()
export class EventDispatcherService implements OnModuleInit, OnModuleDestroy {
  private queue: DispatchTask[] = []
  private processing = false
  private timer: NodeJS.Timeout | null = null
  private readonly baseTopic: string
  private readonly interval: number
  private readonly maxAttempts: number
  private readonly maxDelay: number

  constructor(
    private readonly eventStorage: EventStorageService,
    private readonly natsPublisher: NatsPublisher,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService
  ) {
    this.baseTopic = this.config.get('NATS_BASE_TOPIC') || 'gateway'
    this.interval = this.config.getNumber('EVENTS_DISPATCH_INTERVAL_MS') || 1000
    this.maxAttempts = this.config.getNumber('EVENTS_DISPATCH_MAX_ATTEMPTS') || 8
    this.maxDelay = this.config.getNumber('EVENTS_DISPATCH_MAX_DELAY_MS') || 32000
  }

  async onModuleInit() {
    await this.loadEvents()
    this.start()
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  private start() {
    this.timer = setInterval(() => this.processQueue(), this.interval)
  }

  private async loadEvents() {
    const events = await this.eventStorage.getAll()
    for (const event of events) {
      if (EventSchema.safeParse(event).success) {
        this.queue.push({ event, attempt: 0, nextAttempt: Date.now() })
      }
    }
  }

  private async processQueue() {
    if (this.processing) return
    this.processing = true
    const now = Date.now()
    for (const task of this.queue) {
      if (task.nextAttempt > now) continue
      await this.dispatch(task)
    }
    this.queue = this.queue.filter(task => task.attempt < this.maxAttempts)
    this.processing = false
  }

  private async dispatch(task: DispatchTask) {
    const { event, attempt } = task
    try {
      await this.natsPublisher.publish(this.baseTopic, event)
      await this.eventStorage.removeById(event.eventId)
      this.metrics.incrementAccepted(event.source, event.funnelStage, event.eventType)
      this.logger.logInfo('Event dispatched to NATS', { eventId: event.eventId, eventType: event.eventType })
      task.attempt = this.maxAttempts
    } catch (err: any) {
      task.attempt++
      const delay = Math.min(this.interval * Math.pow(2, task.attempt), this.maxDelay)
      task.nextAttempt = Date.now() + delay
      this.metrics.incrementFailed('dispatch_failed')
      this.logger.logError('Failed to dispatch event', { eventId: event.eventId, attempt: task.attempt, error: err.message })
    }
  }
} 