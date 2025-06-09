import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDate, IsEnum, IsInt, IsOptional, IsString } from 'class-validator'

enum SourceEnum {
  Facebook = 'facebook',
  Tiktok = 'tiktok',
}

export class DemographicsReportFilterDto {
  @ApiPropertyOptional({ description: 'Start date', type: String, format: 'date-time', example: '2023-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDate()
  from?: Date

  @ApiPropertyOptional({ description: 'End date', type: String, format: 'date-time', example: '2023-01-31T23:59:59.999Z' })
  @IsOptional()
  @IsDate()
  to?: Date

  @ApiPropertyOptional({ description: 'Source', enum: SourceEnum, example: 'facebook' })
  @IsOptional()
  @IsEnum(SourceEnum)
  source?: SourceEnum

  @ApiPropertyOptional({ description: 'Age', type: Number, example: 25 })
  @IsOptional()
  @IsInt()
  age?: number

  @ApiPropertyOptional({ description: 'Gender', type: String, example: 'female' })
  @IsOptional()
  @IsString()
  gender?: string

  @ApiPropertyOptional({ description: 'Country', type: String, example: 'Russia' })
  @IsOptional()
  @IsString()
  locationCountry?: string

  @ApiPropertyOptional({ description: 'City', type: String, example: 'Moscow' })
  @IsOptional()
  @IsString()
  locationCity?: string

  @ApiPropertyOptional({ description: 'Minimum followers', type: Number, example: 1000 })
  @IsOptional()
  @IsInt()
  followersMin?: number

  @ApiPropertyOptional({ description: 'Maximum followers', type: Number, example: 10000 })
  @IsOptional()
  @IsInt()
  followersMax?: number
} 