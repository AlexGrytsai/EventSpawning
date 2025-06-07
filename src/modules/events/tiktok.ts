import { z } from 'zod'
import { makeBaseEvent, FunnelStage } from './common'

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

export const TiktokEvent = makeBaseEvent(
  'tiktok',
  TiktokEventType
).extend({
  data: z.object({
    user: TiktokUser,
    engagement: TiktokEngagement,
  }),
})