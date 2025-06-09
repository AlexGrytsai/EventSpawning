import { z } from 'zod'

export const FacebookEventSchema = z.object({
  id: z.string(),
  type: z.literal('facebook'),
  payload: z.record(z.unknown())
})

export const TiktokEventSchema = z.object({
  id: z.string(),
  type: z.literal('tiktok'),
  payload: z.record(z.unknown())
})

export const EventSchema = z.union([FacebookEventSchema, TiktokEventSchema]) 