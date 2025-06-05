import { z } from 'zod'

const FunnelStage = z.enum(['top', 'bottom'])
const FacebookTopEventType = z.enum(['ad.view', 'page.like', 'comment', 'video.view'])
const FacebookBottomEventType = z.enum(['ad.click', 'form.submission', 'checkout.complete'])
const FacebookEventType = z.union([FacebookTopEventType, FacebookBottomEventType])
const FacebookUserLocation = z.object({ country: z.string(), city: z.string() })
const FacebookUser = z.object({
  userId: z.string(),
  name: z.string(),
  age: z.number(),
  gender: z.enum(['male', 'female', 'non-binary']),
  location: FacebookUserLocation
})
const FacebookEngagementTop = z.object({
  actionTime: z.string(),
  referrer: z.enum(['newsfeed', 'marketplace', 'groups']),
  videoId: z.string().nullable()
})
const FacebookEngagementBottom = z.object({
  adId: z.string(),
  campaignId: z.string(),
  clickPosition: z.enum(['top_left', 'bottom_right', 'center']),
  device: z.enum(['mobile', 'desktop']),
  browser: z.enum(['Chrome', 'Firefox', 'Safari']),
  purchaseAmount: z.string().nullable()
})
const FacebookEvent = z.object({
  eventId: z.string(),
  timestamp: z.string(),
  source: z.literal('facebook'),
  funnelStage: FunnelStage,
  eventType: FacebookEventType,
  data: z.object({
    user: FacebookUser,
    engagement: z.union([FacebookEngagementTop, FacebookEngagementBottom])
  })
})

const TiktokTopEventType = z.enum(['video.view', 'like', 'share', 'comment'])
const TiktokBottomEventType = z.enum(['profile.visit', 'purchase', 'follow'])
const TiktokEventType = z.union([TiktokTopEventType, TiktokBottomEventType])
const TiktokUser = z.object({
  userId: z.string(),
  username: z.string(),
  followers: z.number()
})
const TiktokEngagementTop = z.object({
  watchTime: z.number(),
  percentageWatched: z.number(),
  device: z.enum(['Android', 'iOS', 'Desktop']),
  country: z.string(),
  videoId: z.string()
})
const TiktokEngagementBottom = z.object({
  actionTime: z.string(),
  profileId: z.string().nullable(),
  purchasedItem: z.string().nullable(),
  purchaseAmount: z.string().nullable()
})
const TiktokEvent = z.object({
  eventId: z.string(),
  timestamp: z.string(),
  source: z.literal('tiktok'),
  funnelStage: FunnelStage,
  eventType: TiktokEventType,
  data: z.object({
    user: TiktokUser,
    engagement: z.union([TiktokEngagementTop, TiktokEngagementBottom])
  })
})

export const EventSchema = z.discriminatedUnion('source', [FacebookEvent, TiktokEvent]) 