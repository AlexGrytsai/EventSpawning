import { Injectable } from '@nestjs/common'
import { Counter, Histogram, register } from 'prom-client'

@Injectable()
export class MetricsService {
    private acceptedCounter = new Counter({
        name: 'events_accepted_total',
        help: 'Total number of accepted events',
        labelNames: ['source', 'funnelStage', 'eventType']
    })
    private failedCounter = new Counter({
        name: 'events_failed_total',
        help: 'Total number of failed events',
        labelNames: ['reason']
    })
    private processingTimeHistogram = new Histogram({
        name: 'event_processing_time_ms',
        help: 'Processing time of events in ms',
        buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
    })

    incrementAccepted(source: string, funnelStage: string, eventType: string) {
        this.acceptedCounter.inc({ source, funnelStage, eventType })
    }
    incrementFailed(reason: string) {
        this.failedCounter.inc({ reason })
    }
    observeProcessingTime(ms: number) {
        this.processingTimeHistogram.observe(ms)
    }
    getMetrics() {
        return register.metrics()
    }
}