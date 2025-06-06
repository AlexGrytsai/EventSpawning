import { ConfigService } from '../config.service';
import { ConfigService as NestConfigService } from '@nestjs/config';

jest.mock('@nestjs/config');

describe('ConfigService', () => {
  let service: ConfigService;
  let nestConfigServiceMock: jest.Mocked<NestConfigService>;

  beforeEach(() => {
    nestConfigServiceMock = {
      get: jest.fn(),
    } as any;
    (NestConfigService as jest.Mock).mockImplementation(() => nestConfigServiceMock);
    service = new ConfigService();
  });

  it('should get string value', () => {
    nestConfigServiceMock.get.mockReturnValue('value');
    expect(service.get('TEST_STRING')).toBe('value');
  });

  it('should return undefined for missing key', () => {
    nestConfigServiceMock.get.mockReturnValue(undefined);
    expect(service.get('MISSING')).toBeUndefined();
  });

  it('should get number value', () => {
    nestConfigServiceMock.get.mockReturnValue('42');
    expect(service.getNumber('TEST_NUMBER')).toBe(42);
  });

  it('should return undefined for invalid number', () => {
    nestConfigServiceMock.get.mockReturnValue('abc');
    expect(service.getNumber('INVALID_NUMBER')).toBeUndefined();
  });

  it('should get boolean value true', () => {
    nestConfigServiceMock.get.mockReturnValue('true');
    expect(service.getBoolean('TEST_BOOL')).toBe(true);
    nestConfigServiceMock.get.mockReturnValue('1');
    expect(service.getBoolean('TEST_BOOL')).toBe(true);
  });

  it('should get boolean value false', () => {
    nestConfigServiceMock.get.mockReturnValue('false');
    expect(service.getBoolean('TEST_BOOL')).toBe(false);
    nestConfigServiceMock.get.mockReturnValue('0');
    expect(service.getBoolean('TEST_BOOL')).toBe(false);
  });

  it('should return undefined for invalid boolean', () => {
    nestConfigServiceMock.get.mockReturnValue(undefined);
    expect(service.getBoolean('INVALID_BOOL')).toBeUndefined();
  });
}); 