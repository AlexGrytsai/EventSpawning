import { z } from 'zod'
import { FacebookEvent } from './facebook'
import { TiktokEvent } from './tiktok'

export const EventSchema = z.discriminatedUnion('source', [FacebookEvent, TiktokEvent]) 