import { z } from 'zod'
import { FunnelStage } from './common'

const TiktokEventType = z.enum([
  'video.view', 'like', 'share', 'comment',
  'profile.visit', 'purchase', 'follow',
] as const)

const TiktokUser = z.object({
  userId: z.string(),
  username: z.string(),
  followers: z.number(),
})

const TiktokEngagement = z.union([
  z.object({
    watchTime: z.number(),
    percentageWatched: z.number(),
    device: z.enum(['Android', 'iOS', 'Desktop']),
    country: z.string(),
    videoId: z.string()
  }),
  z.object({
    actionTime: z.string(),
    profileId: z.string().nullable(),
    purchasedItem: z.string().nullable(),
    purchaseAmount: z.string().nullable()
  }),
])

/**
 * Creates a Zod schema for a base event object.
 *
 * @param source - A string literal representing the source of the event.
 * @param eventType - A Zod enum defining the possible event types for the source.
 *
 * @returns A Zod object schema with the following properties:
 *  - eventId: A string representing the unique identifier of the event.
 *  - timestamp: A string representing the time the event occurred.
 *  - source: A literal value matching the provided source parameter.
 *  - funnelStage: An enum value indicating the stage of the funnel.
 *  - eventType: An enum value corresponding to the given event types.
 */
const makeBaseEvent = <S extends string, ET extends z.ZodEnum<any>>(
  source: S,
  eventType: ET
) =>
  z.object({
    eventId: z.string(),
    timestamp: z.string(),
    source: z.literal(source),
    funnelStage: FunnelStage,
    eventType,
  })

export const TiktokEvent = makeBaseEvent(
  'tiktok',
  TiktokEventType
).extend({
  data: z.object({
    user: TiktokUser,
    engagement: TiktokEngagement,
  }),
})