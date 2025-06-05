import {Injectable} from '@nestjs/common'
import pino from 'pino'
import { ConfigService } from './config.service'

@Injectable()
export class LoggerService {
    private readonly logger: pino.Logger

    constructor(private readonly config: ConfigService) {
        this.logger = pino({
            level: this.config.get('LOG_LEVEL') || 'info',
            formatters: {
                level: (label) => {
                    return { level: label }
                }
            }
        })
    }

    logInfo(message: string, meta: Record<string, unknown>) {
        this.logger.info(meta, message)
    }

    logEvent(message: string, meta: Record<string, unknown>) {
        this.logger.info(meta, message)
    }

    logError(message: string, meta: Record<string, unknown>) {
        this.logger.error(meta, message)
    }
} 