import { z } from 'zod'

export const FunnelStage = z.enum(['top', 'bottom'])

export const makeEventType = <T extends string, U extends string>(
  top: readonly [T, ...T[]],
  bottom: readonly [U, ...U[]],
) => z.union([z.enum(top), z.enum(bottom)])

export const makeProviderEvent = <
  S extends string,
  ET extends z.ZodTypeAny,
  U extends z.ZodTypeAny,
  E extends z.ZodTypeAny,
>(
  source: S,
  eventType: ET,
  user: U,
  engagement: E,
) =>
  z.object({
    eventId: z.string(),
    timestamp: z.string(),
    source: z.literal(source),
    funnelStage: FunnelStage,
    eventType,
    data: z.object({ user, engagement }),
  })