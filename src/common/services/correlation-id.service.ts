import { Injectable } from '@nestjs/common'
import { AsyncLocalStorage } from 'async_hooks'

@Injectable()
export class CorrelationIdService {
  private readonly als = new AsyncLocalStorage<Map<string, string>>()
  private readonly key = 'correlationId'

  runWithId<T>(correlationId: string, fn: () => T): T {
    const store = new Map<string, string>()
    store.set(this.key, correlationId)
    return this.als.run(store, fn)
  }

  getId(): string | undefined {
    const store = this.als.getStore()
    return store?.get(this.key)
  }
} 