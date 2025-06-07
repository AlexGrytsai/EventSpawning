import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly nestConfigService: NestConfigService) {}

  get(key: string): string | undefined {
    return this.nestConfigService.get<string>(key);
  }

  getNumber(key: string): number | undefined {
    const value = this.get(key);
    if (value === undefined) {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.get(key);
    if (value === undefined) {
      return undefined;
    }
    return value === 'true' || value === '1';
  }
} 