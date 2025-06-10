import { EventStorageService } from '../../src/modules/events/services/event-storage.service'
import * as fs from 'fs/promises'
import { existsSync, createWriteStream } from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('EventStorageService', () => {
  let filePath: string
  let backupPath: string
  let service: EventStorageService
  let originalEventsFilePath: string | undefined
  let originalBackupPath: string | undefined
  let logger: LoggerMock
  let metricsMock: MetricsMock

  class LoggerMock {
    logError = jest.fn()
  }
  class MetricsMock {
    incrementFailed = jest.fn()
  }

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
    logger = new LoggerMock()
    metricsMock = new MetricsMock()
    const { EventStorageService: EventStorageServiceClass } = require('../../src/modules/events/services/event-storage.service')
    service = new EventStorageServiceClass(logger, metricsMock)
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
          location: { country: 'UA', city: 'Kyiv' },
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
          location: { country: 'UA', city: 'Kyiv' },
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
          location: { country: 'UA', city: 'Kyiv' },
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
    const loggerMock = { logError: jest.fn(), logInfo: jest.fn(), logEvent: jest.fn() };
    const metricsServiceMock = { incrementFailed: jest.fn(), incrementAccepted: jest.fn(), observeProcessingTime: jest.fn() };
    const s = new EventStorageService(loggerMock as any, metricsServiceMock as any)
    await expect(s.getAll()).resolves.toEqual([])
    await expect(s.removeById('notfound')).resolves.toBeUndefined()
    if (s['flushTimer']) {
      clearInterval(s['flushTimer'])
    }
    if (s['backupTimer']) {
      clearInterval(s['backupTimer'])
    }
  })

  it('should log and count error on invalid event', async () => {
    await expect(service.add({})).rejects.toThrow()
    expect(metricsMock.incrementFailed).toHaveBeenCalledWith('validation_failed')
  })

  it('should log and count error on file read error', async () => {
    process.env.EVENTS_FILE_PATH = '/invalid/path/events.jsonl'
    const result = await service.getAll()
    expect(result).toEqual([])
  })

  it('should log and count error on removeById file error', async () => {
    process.env.EVENTS_FILE_PATH = '/invalid/path/events.jsonl'
    await service.removeById('notfound')
    expect(metricsMock.incrementFailed).toHaveBeenCalledWith('remove_failed')
    expect(logger.logError).toHaveBeenCalled()
  })

  it('should log and count error on flushQueue file error', async () => {
    const origCreateWriteStream = createWriteStream
    jest.spyOn(require('fs'), 'createWriteStream').mockImplementation(() => {
      const stream: any = {
        write: jest.fn(),
        end: jest.fn(),
        on: function (event: string, handler: Function) {
          if (event === 'error') {
            // Сразу вызываем обработчик ошибки
            setImmediate(() => handler(new Error('flush_failed')))
          }
          return this
        },
      }
      return stream
    })
    service['queue'].push({ eventId: 'fail' })
    service['flushing'] = false
    await service['flushQueue']()
    expect(metricsMock.incrementFailed).toHaveBeenCalledWith('flush_failed')
    expect(logger.logError).toHaveBeenCalled()
    ;(require('fs').createWriteStream as any).mockRestore()
  })

  it('should log and count error on backupFile file error', async () => {
    jest.spyOn(fs, 'copyFile').mockRejectedValue(new Error('backup_failed'))
    process.env.EVENTS_FILE_PATH = filePath
    process.env.EVENTS_BACKUP_PATH = backupPath
    const fsSync = require('fs')
    fsSync.writeFileSync(filePath, 'test')
    await service['backupFile']()
    expect(metricsMock.incrementFailed).toHaveBeenCalledWith('backup_failed')
    expect(logger.logError).toHaveBeenCalled()
    ;(fs.copyFile as any).mockRestore()
  })

  it('should not call fs.copyFile or log error if source file does not exist', async () => {
    const existsSyncSpy = jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false)
    const copyFileSpy = jest.spyOn(fs, 'copyFile')
    process.env.EVENTS_FILE_PATH = filePath
    process.env.EVENTS_BACKUP_PATH = backupPath

    await service['backupFile']()

    expect(existsSyncSpy).toHaveBeenCalledWith(filePath)
    expect(copyFileSpy).not.toHaveBeenCalled()
    expect(logger.logError).not.toHaveBeenCalled()
    expect(metricsMock.incrementFailed).not.toHaveBeenCalled()
    existsSyncSpy.mockRestore()
    copyFileSpy.mockRestore()
  })
}) 