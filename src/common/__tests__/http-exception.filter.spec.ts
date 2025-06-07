import { HttpExceptionFilter } from '../filters/http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockHost: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockHost = {
      switchToHttp: () => ({ getResponse: () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() }) }),
      getType: () => 'http',
    };
  });

  it('should catch HttpException', () => {
    const exception = { getStatus: () => 400, message: 'Bad Request' };
    filter.catch(exception, mockHost);
  });

  it('should catch generic error', () => {
    const exception = new Error('fail');
    filter.catch(exception, mockHost);
  });

  it('should handle edge case with no message', () => {
    const exception = { getStatus: () => 500 };
    filter.catch(exception, mockHost);
  });
}); 