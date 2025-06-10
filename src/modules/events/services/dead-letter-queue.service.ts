import { Injectable } from '@nestjs/common'
import * as fs from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import { dirname } from 'path'

const DLQ_PATH = process.env.DLQ_PATH || './data/dead_letter_queue.jsonl'

@Injectable()
export class DeadLetterQueueService {
  async saveChunk(chunk: unknown[]): Promise<void> {
    await fs.mkdir(dirname(DLQ_PATH), { recursive: true })
    const stream = createWriteStream(DLQ_PATH, { flags: 'a' })
    for (const event of chunk) {
      stream.write(JSON.stringify(event) + '\n')
    }
    await new Promise((resolve, reject) => {
      stream.on('error', reject)
      stream.end(resolve)
    })
  }

  async getAll(): Promise<unknown[]> {
    if (!existsSync(DLQ_PATH)) {
      return []
    }
    const fileContent = await fs.readFile(DLQ_PATH, 'utf-8')
    return fileContent
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
  }
} 