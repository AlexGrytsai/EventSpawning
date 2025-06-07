import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { HealthController } from '../health.controller'
import { HealthService, ReadinessResult } from '../../health/health.service'
import { ConfigService } from '../../services/config.service'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { PrismaService } from '../../services/prisma.service'

describe('HealthController', () => {
  let app: INestApplication
  let healthService: HealthService

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SERVICE_NAME') {
        return 'test-service'
      }
      return undefined
    })
  }

  beforeEach(async () => {
    const mockHealthService: Partial<HealthService> = {
      checkLiveness: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      checkReadiness: jest.fn<() => Promise<ReadinessResult>>().mockResolvedValue({
        isReady: true,
        checks: [{ name: 'db', status: 'ok' }]
      }),
      isShuttingDownNow: jest.fn<() => boolean>().mockReturnValue(false)
    }
    const mockPrismaService: Partial<PrismaService> = {
      $queryRaw: jest.fn<any>().mockImplementation(() => Promise.resolve(1))
    }
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: mockHealthService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService }
      ]
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
    healthService = moduleRef.get<HealthService>(HealthService)
  })

  afterEach(async () => {
    if (app) {
      await app.close()
    }
  })

  it('GET /health/liveness should return 200 if live', async () => {
    jest.spyOn(healthService, 'checkLiveness').mockResolvedValue(true)
    await request(app.getHttpServer())
      .get('/health/liveness')
      .expect(200)
      .expect(res => {
        expect(res.body.status).toBe('ok')
        expect(res.body.service).toBe('test-service')
      })
  })

  it('GET /health/liveness should return 503 if not live', async () => {
    jest.spyOn(healthService, 'checkLiveness').mockResolvedValue(false)
    await request(app.getHttpServer())
      .get('/health/liveness')
      .expect(503)
      .expect(res => {
        expect(res.body.status).toBe('error')
        expect(res.body.service).toBe('test-service')
      })
  })

  it('GET /health/readiness should return 200 if ready', async () => {
    jest.spyOn(healthService, 'checkReadiness').mockResolvedValue({ isReady: true, checks: [{ name: 'nats', status: 'ok' }] })
    await request(app.getHttpServer())
      .get('/health/readiness')
      .expect(200)
      .expect(res => {
        expect(res.body.status).toBe('ok')
        expect(res.body.service).toBe('test-service')
        expect(res.body.checks).toBeDefined()
      })
  })

  it('GET /health/readiness should return 503 if not ready', async () => {
    jest.spyOn(healthService, 'checkReadiness').mockResolvedValue({ isReady: false, checks: [{ name: 'postgres', status: 'error', message: 'fail' }] })
    await request(app.getHttpServer())
      .get('/health/readiness')
      .expect(503)
      .expect(res => {
        expect(res.body.status).toBe('error')
        expect(res.body.service).toBe('test-service')
        expect(res.body.checks[0].name).toBe('postgres')
        expect(res.body.checks[0].status).toBe('error')
      })
  })
}) 