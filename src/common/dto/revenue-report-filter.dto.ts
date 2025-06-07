import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';
import { z } from 'zod';

export class RevenueReportFilterDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsIn(['facebook', 'tiktok'])
  source?: 'facebook' | 'tiktok';

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value) || 1)
  @IsNumber()
  @Min(1)
  page?: number = 1;
}

export const RevenueReportFilterSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  source: z.enum(['facebook', 'tiktok']).optional(),
  campaignId: z.string().optional(),
  currency: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
}); 