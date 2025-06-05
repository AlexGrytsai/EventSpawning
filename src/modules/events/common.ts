import { z } from 'zod'

export const FunnelStage = z.enum(['top', 'bottom'])

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

export const FooEvent = makeBaseEvent(
  'foo',
  z.enum(['fooStarted', 'fooCompleted'] as const)
).extend({
  data: z.object({
    user: z.object({ id: z.string(), name: z.string() }),
    engagement: z.object({ clicks: z.number() }),
  }),
})