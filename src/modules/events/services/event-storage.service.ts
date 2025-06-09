import { Injectable } from '@nestjs/common'
import { EventSchema } from '../dto/event.zod'
import * as fs from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import { EventEmitter } from 'events'

const FLUSH_INTERVAL = +(process.env.EVENTS_FLUSH_INTERVAL_MS || 1000)
const BACKUP_INTERVAL = +(process.env.EVENTS_BACKUP_INTERVAL_MS || 60000)

@Injectable()
export class EventStorageService {
  private queue: unknown[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private backupTimer: NodeJS.Timeout | null = null
  private flushing = false
  private eventEmitter = new EventEmitter()
  private metrics = {
    eventsInQueue: 0,
    writeErrors: 0,
    readErrors: 0,
    lastFlushDurationMs: 0,
  }

  constructor() {
    this.startFlushTimer()
    this.startBackupTimer()
  }

  async add(event: unknown) {
    const parsed = EventSchema.safeParse(event)
    if (!parsed.success) {
      throw new Error('Invalid event')
    }
    this.queue.push(parsed.data)
    this.metrics.eventsInQueue = this.queue.length
    this.eventEmitter.emit('eventAdded')
  }

  async getAll() {
    try {
      const filePath = process.env.EVENTS_FILE_PATH || '/data/events.jsonl'
      const fileContent = await fs.readFile(filePath, 'utf-8')
      return fileContent
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return []
      }
      this.metrics.readErrors++
      return []
    }
  }

  async removeById(eventId: string) {
    try {
      const filePath = process.env.EVENTS_FILE_PATH || '/data/events.jsonl'
      this.queue = this.queue.filter((event: any) => event.eventId !== eventId)
      const data = await fs.readFile(filePath, 'utf-8')
      const lines = data.split('\n').filter(Boolean)
      const filtered = lines.filter(line => {
        try {
          const obj = JSON.parse(line)
          return obj.eventId !== eventId
        } catch {
          return true
        }
      })
      await fs.writeFile(filePath, filtered.join('\n') + '\n', 'utf-8')
    } catch {
      this.metrics.writeErrors++
    }
  }

  private async flushQueue() {
    if (this.flushing || this.queue.length === 0) {
      return
    }
    this.flushing = true
    const toWrite = this.queue.splice(0, this.queue.length)
    const start = Date.now()
    try {
      const filePath = process.env.EVENTS_FILE_PATH || '/data/events.jsonl'
      const stream = createWriteStream(filePath, { flags: 'a' })
      for (const event of toWrite) {
        stream.write(JSON.stringify(event) + '\n')
      }
      await new Promise((resolve, reject) => {
        stream.on('error', reject)
        stream.end(resolve)
      })
      this.metrics.lastFlushDurationMs = Date.now() - start
    } catch {
      this.metrics.writeErrors++
      this.queue.unshift(...toWrite)
    } finally {
      this.flushing = false
      this.metrics.eventsInQueue = this.queue.length
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => this.flushQueue(), FLUSH_INTERVAL)
  }

  private async backupFile() {
    try {
      const filePath = process.env.EVENTS_FILE_PATH || '/data/events.jsonl'
      const backupPath = process.env.EVENTS_BACKUP_PATH || '/data/events_backup.jsonl'
      if (existsSync(filePath)) {
        await fs.copyFile(filePath, backupPath)
      }
    } catch {
      this.metrics.writeErrors++
    }
  }

  private startBackupTimer() {
    this.backupTimer = setInterval(() => this.backupFile(), BACKUP_INTERVAL)
  }

  getMetrics() {
    return { ...this.metrics }
  }

  async onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    if (this.backupTimer) {
      clearInterval(this.backupTimer)
    }
    await this.flushQueue()
    await this.backupFile()
  }
} 