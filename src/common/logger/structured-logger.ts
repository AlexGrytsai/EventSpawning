import { randomUUID } from 'crypto'

export class StructuredLogger {
  log(message: string, meta?: Record<string, unknown>, correlationId?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: correlationId || randomUUID(),
      message,
      ...meta
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logEntry))
  }

  error(message: string, meta?: Record<string, unknown>, correlationId?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: correlationId || randomUUID(),
      level: 'error',
      message,
      ...meta
    }
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(logEntry))
  }
} 