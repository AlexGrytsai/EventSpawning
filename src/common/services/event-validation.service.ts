import { Injectable } from '@nestjs/common'
import { EventSchema } from '../../modules/events/dto/event.zod'

@Injectable()
export class EventValidationService {
  validate(event: unknown) {
    return EventSchema.parse(event)
  }
  safeValidate(event: unknown) {
    return EventSchema.safeParse(event)
  }
} 