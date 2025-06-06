import { MetricsService } from '../metrics.service';
import { register } from 'prom-client';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('should increment accepted', () => {
    expect(() => service.incrementAccepted('src', 'stage', 'type')).not.toThrow();
  });

  it('should increment failed', () => {
    expect(() => service.incrementFailed('reason')).not.toThrow();
  });

  it('should observe processing time', () => {
    expect(() => service.observeProcessingTime(123)).not.toThrow();
  });

  it('should get metrics', () => {
    const metrics = service.getMetrics();
    expect(metrics).toBeDefined();
  });

  afterEach(() => {
    register.clear();
  });
}); 