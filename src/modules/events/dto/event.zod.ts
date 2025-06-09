import { z } from 'zod'
import { FacebookEvent } from '../schemas/facebook'
import { TiktokEvent } from '../schemas/tiktok'

export const EventSchema = z.discriminatedUnion('source', [FacebookEvent, TiktokEvent])

export const EventArraySchema = z.array(EventSchema) 