import { Injectable } from '@nestjs/common';
import { ConfigModule, ConfigService as NestConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

@Injectable()
export class ConfigService {
  private readonly nestConfigService: NestConfigService;

  constructor() {
    const envFile = process.env.SERVICE_ENV ? `.env.${process.env.SERVICE_ENV}` : '.env';
    dotenv.config({ path: path.resolve(process.cwd(), envFile) });
    this.nestConfigService = new NestConfigService();
  }

  get(key: string): string | undefined {
    return this.nestConfigService.get<string>(key);
  }

  getNumber(key: string): number | undefined {
    const value = this.get(key);
    return value ? Number(value) : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.get(key);
    if (value === undefined) return undefined;
    return value === 'true' || value === '1';
  }
} 