import { EventStorageService } from '../../src/modules/events/services/event-storage.service'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('EventStorageService', () => {
  let filePath: string
  let backupPath: string
  let service: EventStorageService
  let originalEventsFilePath: string | undefined
  let originalBackupPath: string | undefined

  beforeAll(() => {
    originalEventsFilePath = process.env.EVENTS_FILE_PATH
    originalBackupPath = process.env.EVENTS_BACKUP_PATH
  })

  beforeEach(async () => {
    jest.resetModules()
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}`
    filePath = path.join(os.tmpdir(), `test_events_${unique}.jsonl`)
    backupPath = path.join(os.tmpdir(), `test_events_backup_${unique}.jsonl`)
    process.env.EVENTS_FILE_PATH = filePath
    process.env.EVENTS_BACKUP_PATH = backupPath
    const { EventStorageService: EventStorageServiceClass } = require('../../src/modules/events/services/event-storage.service')
    service = new EventStorageServiceClass()
    if (existsSync(filePath)) {
      await fs.unlink(filePath)
    }
    if (existsSync(backupPath)) {
      await fs.unlink(backupPath)
    }
  })

  afterEach(async () => {
    if (service && typeof service.onModuleDestroy === 'function') {
      await service.onModuleDestroy()
    }
    if (existsSync(filePath)) {
      await fs.unlink(filePath)
    }
    if (existsSync(backupPath)) {
      await fs.unlink(backupPath)
    }
    process.env.EVENTS_FILE_PATH = originalEventsFilePath
    process.env.EVENTS_BACKUP_PATH = originalBackupPath
    jest.clearAllTimers && jest.clearAllTimers()
  })

  afterAll(() => {
    process.env.EVENTS_FILE_PATH = originalEventsFilePath
    process.env.EVENTS_BACKUP_PATH = originalBackupPath
  })

  it('should add and get event', async () => {
    const event = {
      eventId: '1',
      timestamp: new Date().toISOString(),
      source: 'facebook',
      funnelStage: 'top',
      eventType: 'ad.view',
      data: {
        user: {
          userId: 'u1',
          name: 'Test',
          age: 20,
          gender: 'male',
          location: { country: 'RU', city: 'Moscow' },
        },
        engagement: {
          actionTime: new Date().toISOString(),
          referrer: 'newsfeed',
          videoId: null,
        },
      },
    }
    await service.add(event)
    await new Promise(r => setTimeout(r, 1100))
    const all = await service.getAll()
    expect(all.length).toBe(1)
    expect(all[0].eventId).toBe('1')
  })

  it('should remove event by id', async () => {
    const event = {
      eventId: '2',
      timestamp: new Date().toISOString(),
      source: 'facebook',
      funnelStage: 'top',
      eventType: 'ad.view',
      data: {
        user: {
          userId: 'u2',
          name: 'Test2',
          age: 22,
          gender: 'female',
          location: { country: 'RU', city: 'Moscow' },
        },
        engagement: {
          actionTime: new Date().toISOString(),
          referrer: 'newsfeed',
          videoId: null,
        },
      },
    }
    await service.add(event)
    await new Promise(r => setTimeout(r, 1100))
    await service.removeById('2')
    const all = await service.getAll()
    expect(all.length).toBe(0)
  })

  it('should handle invalid event', async () => {
    await expect(service.add({})).rejects.toThrow()
  })

  it('should backup file', async () => {
    const event = {
      eventId: '3',
      timestamp: new Date().toISOString(),
      source: 'facebook',
      funnelStage: 'top',
      eventType: 'ad.view',
      data: {
        user: {
          userId: 'u3',
          name: 'Test3',
          age: 23,
          gender: 'male',
          location: { country: 'RU', city: 'Moscow' },
        },
        engagement: {
          actionTime: new Date().toISOString(),
          referrer: 'newsfeed',
          videoId: null,
        },
      },
    }
    await service.add(event)
    await new Promise(r => setTimeout(r, 1100))
    await service['backupFile']()
    expect(existsSync(backupPath)).toBe(true)
    const backup = await fs.readFile(backupPath, 'utf-8')
    expect(backup.length).toBeGreaterThan(0)
  })

  it('should be resilient to file errors', async () => {
    process.env.EVENTS_FILE_PATH = '/invalid/path/events.jsonl'
    const s = new EventStorageService()
    await expect(s.getAll()).resolves.toEqual([])
    await expect(s.removeById('notfound')).resolves.toBeUndefined()
    if (s['flushTimer']) {
      clearInterval(s['flushTimer'])
    }
    if (s['backupTimer']) {
      clearInterval(s['backupTimer'])
    }
  })
}) 