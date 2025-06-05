import { z } from 'zod'
import { FunnelStage, makeEventType, makeProviderEvent } from './common'

const FacebookEventType = makeEventType(
  ['ad.view', 'page.like', 'comment', 'video.view'] as const,
  ['ad.click', 'form.submission', 'checkout.complete'] as const,
)

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

export const FacebookEvent = makeProviderEvent('facebook', FacebookEventType, FacebookUser, FacebookEngagement)