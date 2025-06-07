import { NatsConsumer } from '../nats.consumer'

describe('NatsConsumer', () => {
  let consumer: NatsConsumer
  let js: any
  let logger: any

  beforeEach(() => {
    js = { subscribe: jest.fn() }
    logger = { logEvent: jest.fn(), logError: jest.fn() }
    consumer = new NatsConsumer(js, logger)
  })

  it('should use correlation ID from headers', async () => {
    const msg = {
      headers: { get: (k: string) => (k === 'x-correlation-id' ? 'corr-123' : undefined) },
      data: Buffer.from(JSON.stringify({ eventType: 'test', source: 'fb' })),
      ack: jest.fn(),
      term: jest.fn()
    }
    js.subscribe.mockResolvedValueOnce((async function* () { yield msg })())
    await consumer.subscribe('fb.events', 'fb-durable')
    expect(logger.logEvent).toHaveBeenCalledWith('Event received', expect.objectContaining({ correlationId: 'corr-123' }))
    expect(msg.ack).toHaveBeenCalled()
  })

  it('should generate correlation ID if missing', async () => {
    const msg = {
      headers: { get: () => undefined },
      data: Buffer.from(JSON.stringify({ eventType: 'test', source: 'fb' })),
      ack: jest.fn(),
      term: jest.fn()
    }
    js.subscribe.mockResolvedValueOnce((async function* () { yield msg })())
    await consumer.subscribe('fb.events', 'fb-durable')
    const call = logger.logEvent.mock.calls.find(([msg]) => msg === 'Event received')
    expect(call[1].correlationId).toEqual(expect.any(String))
    expect(msg.ack).toHaveBeenCalled()
  })

  it('should log error and term on invalid event', async () => {
    const msg = {
      headers: { get: () => 'corr-err' },
      data: Buffer.from('not-json'),
      ack: jest.fn(),
      term: jest.fn()
    }
    js.subscribe.mockResolvedValueOnce((async function* () { yield msg })())
    await consumer.subscribe('fb.events', 'fb-durable')
    expect(logger.logError).toHaveBeenCalledWith('Invalid event format', { correlationId: 'corr-err' })
    expect(msg.term).toHaveBeenCalled()
  })

  it('should always log correlation ID (even if not provided)', async () => {
    const msg = {
      headers: { get: () => undefined },
      data: Buffer.from(JSON.stringify({ eventType: 'test', source: 'fb' })),
      ack: jest.fn(),
      term: jest.fn()
    }
    js.subscribe.mockResolvedValueOnce((async function* () { yield msg })())
    await consumer.subscribe('fb.events', 'fb-durable')
    const call = logger.logEvent.mock.calls.find(([msg]) => msg === 'Event received')
    expect(call[1].correlationId).toBeDefined()
    expect(msg.ack).toHaveBeenCalled()
  })
}) 