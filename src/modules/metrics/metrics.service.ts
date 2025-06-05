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

/**
 * Increments the counter for accepted events.
 *
 * This method is used to track the total number of events
 * that have been accepted, categorized by their source,
 * funnel stage, and event type.
 *
 * @param source - The source of the event (e.g., 'facebook', 'tiktok').
 * @param funnelStage - The stage of the funnel (e.g., 'top', 'bottom').
 * @param eventType - The type of event (e.g., 'purchase', 'like').
 */
    incrementAccepted(source: string, funnelStage: string, eventType: string) {
        this.acceptedCounter.inc({ source, funnelStage, eventType })
    }
    /**
     * Increments the counter for failed events.
     *
     * This method is used to track the total number of events
     * that failed, categorized by their reason.
     *
     * @param reason - The reason the event failed (e.g., 'invalid', 'unknown').
     */
    incrementFailed(reason: string) {
        this.failedCounter.inc({ reason })
    }
    /**
     * Records the processing time of an event in ms.
     *
     * This method is used to track the processing time of events,
     * which is used to calculate the average, min, max, and percentiles
     * of the processing time.
     *
     * @param ms - The processing time of the event in milliseconds.
     */
    observeProcessingTime(ms: number) {
        this.processingTimeHistogram.observe(ms)
    }
    /**
     * Returns the current metrics.
     *
     * This method is used to return the current metrics to the caller.
     * The metrics are a snapshot of the current state of the metrics,
     * and can be used to track the performance of the application.
     *
     * @returns The current metrics.
     */
    getMetrics() {
        return register.metrics()
    }
}