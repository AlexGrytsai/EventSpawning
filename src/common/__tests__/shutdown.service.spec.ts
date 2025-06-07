import { ShutdownService } from '../services/shutdown.service'

let health: any
let events: any
let prisma: any
let nats: any

const createService = (healthArg: any, prismaArg: any, natsArg: any, eventsArg: any) => new ShutdownService(
  healthArg,
  prismaArg,
  natsArg,
  eventsArg
)

describe('ShutdownService', () => {
  beforeEach(() => {
    health = { setReadiness: jest.fn() }
    events = { awaitAllTasksDone: jest.fn().mockResolvedValue(undefined) }
    prisma = { onModuleDestroy: jest.fn().mockResolvedValue(undefined) }
    nats = { onModuleDestroy: jest.fn().mockResolvedValue(undefined) }
    jest.clearAllMocks()
  })

  it('should shutdown gracefully', async () => {
    const service = createService(health, prisma, nats, events)
    await expect(service.shutdown()).resolves.toBeUndefined();
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(events.awaitAllTasksDone).toHaveBeenCalled()
    expect(prisma.onModuleDestroy).toHaveBeenCalled()
    expect(nats.onModuleDestroy).toHaveBeenCalled()
  });

  it('should log error if shutdown fails', async () => {
    nats.onModuleDestroy.mockRejectedValueOnce(new Error('fail'));
    const service = createService(health, prisma, nats, events)
    await expect(service.shutdown()).rejects.toThrow('fail');
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(events.awaitAllTasksDone).toHaveBeenCalled()
    expect(prisma.onModuleDestroy).toHaveBeenCalled()
    expect(nats.onModuleDestroy).toHaveBeenCalled()
  });

  it('sets readiness to false and waits for all tasks', async () => {
    const service = createService(health, prisma, nats, events)
    await service.shutdown()
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(events.awaitAllTasksDone).toHaveBeenCalled()
  })

  it('throws if events.awaitAllTasksDone fails, but still sets readiness', async () => {
    events.awaitAllTasksDone.mockRejectedValueOnce(new Error('events error'))
    const service = createService(health, prisma, nats, events)
    await expect(service.shutdown()).rejects.toThrow('events error')
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(events.awaitAllTasksDone).toHaveBeenCalled()
  })

  it('throws if prisma.onModuleDestroy fails, but still sets readiness', async () => {
    prisma.onModuleDestroy.mockRejectedValueOnce(new Error('prisma error'))
    const service = createService(health, prisma, nats, events)
    await expect(service.shutdown()).rejects.toThrow('prisma error')
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(prisma.onModuleDestroy).toHaveBeenCalled()
  })

  it('throws if nats.onModuleDestroy fails, but still sets readiness', async () => {
    nats.onModuleDestroy.mockRejectedValueOnce(new Error('nats error'))
    const service = createService(health, prisma, nats, events)
    await expect(service.shutdown()).rejects.toThrow('nats error')
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(nats.onModuleDestroy).toHaveBeenCalled()
  })

  it('throws first error if all dependencies fail, but still sets readiness', async () => {
    events.awaitAllTasksDone.mockRejectedValueOnce(new Error('events error'))
    prisma.onModuleDestroy.mockRejectedValueOnce(new Error('prisma error'))
    nats.onModuleDestroy.mockRejectedValueOnce(new Error('nats error'))
    const service = createService(health, prisma, nats, events)
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
    failMock: (events: any, prisma: any, nats: any) => events.awaitAllTasksDone.mockRejectedValueOnce(new Error('events error')),
    error: 'events error',
    called: [
      (events: any) => expect(events.awaitAllTasksDone).toHaveBeenCalled(),
      (prisma: any) => expect(prisma.onModuleDestroy).toHaveBeenCalled(),
      (nats: any) => expect(nats.onModuleDestroy).toHaveBeenCalled(),
    ],
  },
  {
    name: 'prisma.onModuleDestroy',
    failMock: (events: any, prisma: any, nats: any) => prisma.onModuleDestroy.mockRejectedValueOnce(new Error('prisma error')),
    error: 'prisma error',
    called: [
      (events: any) => expect(events.awaitAllTasksDone).toHaveBeenCalled(),
      (prisma: any) => expect(prisma.onModuleDestroy).toHaveBeenCalled(),
      (nats: any) => expect(nats.onModuleDestroy).toHaveBeenCalled(),
    ],
  },
  {
    name: 'nats.onModuleDestroy',
    failMock: (events: any, prisma: any, nats: any) => nats.onModuleDestroy.mockRejectedValueOnce(new Error('nats error')),
    error: 'nats error',
    called: [
      (events: any) => expect(events.awaitAllTasksDone).toHaveBeenCalled(),
      (prisma: any) => expect(prisma.onModuleDestroy).toHaveBeenCalled(),
      (nats: any) => expect(nats.onModuleDestroy).toHaveBeenCalled(),
    ],
  },
])('shutdown error handling: $name', ({ failMock, error, called }) => {
  let health: any
  let events: any
  let prisma: any
  let nats: any

  beforeEach(() => {
    health = { setReadiness: jest.fn() }
    events = { awaitAllTasksDone: jest.fn().mockResolvedValue(undefined) }
    prisma = { onModuleDestroy: jest.fn().mockResolvedValue(undefined) }
    nats = { onModuleDestroy: jest.fn().mockResolvedValue(undefined) }
    jest.clearAllMocks()
  })

  it('continues shutdown and sets readiness to false', async () => {
    failMock(events, prisma, nats)
    const service = createService(health, prisma, nats, events)
    await expect(service.shutdown()).rejects.toThrow(error)
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    called[0](events)
    called[1](prisma)
    called[2](nats)
  })
}) 