import { z } from 'zod'

export const FunnelStage = z.enum(['top', 'bottom'])

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

export const FooEvent = makeBaseEvent(
  'foo',
  z.enum(['fooStarted', 'fooCompleted'] as const)
).extend({
  data: z.object({
    user: z.object({ id: z.string(), name: z.string() }),
    engagement: z.object({ clicks: z.number() }),
  }),
})