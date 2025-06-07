import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  /**
   * Cleans up Prisma client when the application is being destroyed.
   *
   * This is a part of the {@link OnModuleDestroy} interface.
   */
  async onModuleDestroy() {
    await this.$disconnect()
  }
} 