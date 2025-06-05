import { Injectable } from '@nestjs/common'

@Injectable()
export class MetricsService {
    incrementAccepted(source: string, funnelStage: string, eventType: string) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ level: 'metrics', type: 'accepted', source, funnelStage, eventType }))
    }
    incrementFailed(reason: string) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ level: 'metrics', type: 'failed', reason }))
    }
    observeProcessingTime(ms: number) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ level: 'metrics', type: 'processingTime', ms }))
    }
}