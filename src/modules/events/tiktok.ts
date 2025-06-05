import { z } from 'zod'
import { makeEventType, makeProviderEvent } from './common'

const TiktokEventType = makeEventType(
  ['video.view', 'like', 'share', 'comment'] as const,
  ['profile.visit', 'purchase', 'follow'] as const,
)

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

export const TiktokEvent = makeProviderEvent('tiktok', TiktokEventType, TiktokUser, TiktokEngagement)