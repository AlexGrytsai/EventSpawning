import { z } from 'zod'
import { FunnelStage } from './common'

const FacebookEventType = z.enum([
  'ad.view', 'page.like', 'comment', 'video.view',
  'ad.click', 'form.submission', 'checkout.complete',
] as const)

const FacebookUser = z.object({
  userId: z.string(),
  name: z.string(),
  age: z.number(),
  gender: z.enum(['male', 'female', 'non-binary']),
  location: z.object({ country: z.string(), city: z.string() }),
})

const FacebookEngagement = z.union([
  z.object({
    actionTime: z.string(),
    referrer: z.enum(['newsfeed', 'marketplace', 'groups']),
    videoId: z.string().nullable()
  }),
  z.object({
    adId: z.string(),
    campaignId: z.string(),
    clickPosition: z.enum(['top_left', 'bottom_right', 'center']),
    device: z.enum(['mobile', 'desktop']),
    browser: z.enum(['Chrome', 'Firefox', 'Safari']),
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

export const FacebookEvent = makeBaseEvent(
  'facebook',
  FacebookEventType
).extend({
  data: z.object({
    user: FacebookUser,
    engagement: FacebookEngagement,
  }),
})