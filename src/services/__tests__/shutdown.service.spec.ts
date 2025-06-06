import { ShutdownService } from '../shutdown.service'

const health = { setReadiness: jest.fn() }
const events = { awaitAllTasksDone: jest.fn().mockResolvedValue(undefined) }
const prisma = { onModuleDestroy: jest.fn().mockResolvedValue(undefined) }
const nats = { onModuleDestroy: jest.fn().mockResolvedValue(undefined) }

const createService = () => new ShutdownService(
  health as any,
  prisma as any,
  nats as any,
  events as any
)

describe('ShutdownService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets readiness to false and waits for all tasks', async () => {
    const service = createService()
    await service.shutdown()
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(events.awaitAllTasksDone).toHaveBeenCalled()
  })

  it('throws if events.awaitAllTasksDone fails, but still sets readiness', async () => {
    events.awaitAllTasksDone.mockRejectedValueOnce(new Error('events error'))
    const service = createService()
    await expect(service.shutdown()).rejects.toThrow('events error')
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(events.awaitAllTasksDone).toHaveBeenCalled()
  })

  it('throws if prisma.onModuleDestroy fails, but still sets readiness', async () => {
    prisma.onModuleDestroy.mockRejectedValueOnce(new Error('prisma error'))
    const service = createService()
    await expect(service.shutdown()).rejects.toThrow('prisma error')
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(prisma.onModuleDestroy).toHaveBeenCalled()
  })

  it('throws if nats.onModuleDestroy fails, but still sets readiness', async () => {
    nats.onModuleDestroy.mockRejectedValueOnce(new Error('nats error'))
    const service = createService()
    await expect(service.shutdown()).rejects.toThrow('nats error')
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(nats.onModuleDestroy).toHaveBeenCalled()
  })

  it('throws first error if all dependencies fail, but still sets readiness', async () => {
    events.awaitAllTasksDone.mockRejectedValueOnce(new Error('events error'))
    prisma.onModuleDestroy.mockRejectedValueOnce(new Error('prisma error'))
    nats.onModuleDestroy.mockRejectedValueOnce(new Error('nats error'))
    const service = createService()
    await expect(service.shutdown()).rejects.toThrow('events error')
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(events.awaitAllTasksDone).toHaveBeenCalled()
    expect(prisma.onModuleDestroy).toHaveBeenCalled()
    expect(nats.onModuleDestroy).toHaveBeenCalled()
  })
})

describe.each([
  {
    name: 'events.awaitAllTasksDone',
    failMock: () => events.awaitAllTasksDone.mockRejectedValueOnce(new Error('events error')),
    error: 'events error',
    called: [() => expect(events.awaitAllTasksDone).toHaveBeenCalled(), () => expect(prisma.onModuleDestroy).toHaveBeenCalled(), () => expect(nats.onModuleDestroy).toHaveBeenCalled()],
  },
  {
    name: 'prisma.onModuleDestroy',
    failMock: () => prisma.onModuleDestroy.mockRejectedValueOnce(new Error('prisma error')),
    error: 'prisma error',
    called: [() => expect(events.awaitAllTasksDone).toHaveBeenCalled(), () => expect(prisma.onModuleDestroy).toHaveBeenCalled(), () => expect(nats.onModuleDestroy).toHaveBeenCalled()],
  },
  {
    name: 'nats.onModuleDestroy',
    failMock: () => nats.onModuleDestroy.mockRejectedValueOnce(new Error('nats error')),
    error: 'nats error',
    called: [() => expect(events.awaitAllTasksDone).toHaveBeenCalled(), () => expect(prisma.onModuleDestroy).toHaveBeenCalled(), () => expect(nats.onModuleDestroy).toHaveBeenCalled()],
  },
])('shutdown error handling: $name', ({ failMock, error, called }) => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('continues shutdown and sets readiness to false', async () => {
    failMock()
    const service = createService()
    await expect(service.shutdown()).rejects.toThrow(error)
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    called.forEach(fn => fn())
  })
}) 