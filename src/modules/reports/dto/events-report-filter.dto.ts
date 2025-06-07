import { z } from 'zod'

export const EventsReportFilterDto = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  source: z.enum(['facebook', 'tiktok']).optional(),
  funnelStage: z.enum(['top', 'bottom']).optional(),
  eventType: z.string().optional(),
  campaignId: z.string().optional(),
  userId: z.string().optional(),
})

export type EventsReportFilter = z.infer<typeof EventsReportFilterDto> 