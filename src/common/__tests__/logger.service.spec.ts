import { LoggerService } from '../services/logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let consoleInfo: jest.SpyInstance;
  let consoleError: jest.SpyInstance;
  let config: any;
  let correlationIdService: any;

  beforeEach(() => {
    consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    config = { get: jest.fn() };
    correlationIdService = { getId: jest.fn().mockReturnValue('test-cid') };
    service = new LoggerService(config, correlationIdService);
    jest.spyOn(service['logger'], 'info').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
    jest.spyOn(service, 'logInfo');
    jest.spyOn(service, 'logEvent');
    jest.spyOn(service, 'logError');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log info', () => {
    service.logInfo('message', { foo: 'bar' });
    expect(service['logger'].info).toHaveBeenCalled();
  });

  it('should log event', () => {
    service.logEvent('event', { id: 1 });
    expect(service['logger'].info).toHaveBeenCalled();
  });

  it('should log error', () => {
    service.logError('error', { err: true });
    expect(service['logger'].error).toHaveBeenCalled();
  });

  it('should handle empty message', () => {
    service.logInfo('', {});
    expect(service['logger'].info).toHaveBeenCalled();
  });
}); 