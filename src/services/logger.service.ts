import {Injectable} from '@nestjs/common'

@Injectable()
export class LoggerService {
    logInfo(message: string, meta: Record<string, unknown>) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({level: 'info', message, ...meta}))
    }

    logEvent(message: string, meta: Record<string, unknown>) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({level: 'info', message, ...meta}))
    }

    logError(message: string, meta: Record<string, unknown>) {
        // eslint-disable-next-line no-console
        console.error(JSON.stringify({level: 'error', message, ...meta}))
    }
} 