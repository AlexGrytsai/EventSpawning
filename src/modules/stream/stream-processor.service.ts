import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { parser } from 'stream-json'
import { streamArray } from 'stream-json/streamers/StreamArray'
import { Transform } from 'stream'
import { EventSchema } from '../../common/validation/event.schema'
import { StructuredLogger } from '../../common/logger/structured-logger'

export class StreamProcessorService {
  constructor(private logger = new StructuredLogger()) {}

  async process(inputPath: string, outputPath: string, correlationId?: string) {
    const readStream = createReadStream(inputPath)
    const writeStream = createWriteStream(outputPath)
    const jsonParser = parser()
    const arrayStreamer = streamArray()

    const validateAndWrite = new Transform({
      objectMode: true,
      transform: (chunk, _encoding, callback) => {
        const { value } = chunk
        const result = EventSchema.safeParse(value)
        if (result.success) {
          writeStream.write(JSON.stringify(result.data) + '\n')
        } else {
          this.logger.error('Invalid event', { errors: result.error.errors, event: value }, correlationId)
        }
        callback()
      }
    })

    try {
      await pipeline(
        readStream,
        jsonParser,
        arrayStreamer,
        validateAndWrite
      )
    } catch (error) {
      this.logger.error('Stream processing error', { error }, correlationId)
    } finally {
      writeStream.end()
    }
  }
} 