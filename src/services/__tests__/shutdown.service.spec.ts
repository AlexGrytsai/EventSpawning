import { ShutdownService } from '../shutdown.service'

const health = { setReadiness: jest.fn() }
const events = { awaitAllTasksDone: jest.fn().mockResolvedValue(undefined) }
const prisma = { onModuleDestroy: jest.fn().mockResolvedValue(undefined) }
const nats = { onModuleDestroy: jest.fn().mockResolvedValue(undefined) }

const createService = () => new ShutdownService(
  health as any,
  events as any,
  prisma as any,
  nats as any
)

describe('ShutdownService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets readiness to false and waits for all tasks and closes connections', async () => {
    const service = createService()
    await service.shutdown()
    expect(health.setReadiness).toHaveBeenCalledWith(false)
    expect(events.awaitAllTasksDone).toHaveBeenCalled()
    expect(nats.onModuleDestroy).toHaveBeenCalled()
    expect(prisma.onModuleDestroy).toHaveBeenCalled()
  })
}) 