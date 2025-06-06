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

    /**
     * Logs an informational message with additional metadata.
     *
     * @param message - The informational message to log.
     * @param meta - A record containing additional metadata to include in the log entry.
     */
    logInfo(message: string, meta: Record<string, unknown>) {
        this.logger.info(meta, message)
    }

    /**
     * Logs a general event message with additional metadata.
     *
     * @param message - The event message to log.
     * @param meta - A record containing additional metadata to include in the log entry.
     */
    logEvent(message: string, meta: Record<string, unknown>) {
        this.logger.info(meta, message)
    }

    /**
     * Logs an error message with additional metadata.
     *
     * @param message - The error message to log.
     * @param meta - A record containing additional metadata to include in the log entry.
     */
    logError(message: string, meta: Record<string, unknown>) {
        this.logger.error(meta, message)
    }
} 