import { z } from 'zod'
import { makeBaseEvent } from './common'

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

export const FacebookEvent = makeBaseEvent(
  'facebook',
  FacebookEventType
).extend({
  data: z.object({
    user: FacebookUser,
    engagement: FacebookEngagement,
  }),
})