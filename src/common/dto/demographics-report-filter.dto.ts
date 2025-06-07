import { z } from 'zod'

export const DemographicsReportFilterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  source: z.enum(['facebook', 'tiktok']).optional(),
  age: z.number().int().optional(),
  gender: z.string().optional(),
  locationCountry: z.string().optional(),
  locationCity: z.string().optional(),
  followersMin: z.number().int().optional(),
  followersMax: z.number().int().optional(),
})

export type DemographicsReportFilterDto = z.infer<typeof DemographicsReportFilterSchema> 