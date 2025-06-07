import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable, defer } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { CorrelationIdService } from './correlation-id.service'

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  constructor(private readonly correlationIdService: CorrelationIdService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest()
    let correlationId = req.headers['x-correlation-id']
    if (Array.isArray(correlationId)) {
      correlationId = correlationId[0]
    }
    if (!correlationId) {
      correlationId = uuidv4()
    }
    return defer(() => this.correlationIdService.runWithId(correlationId, () => next.handle()))
  }
} 