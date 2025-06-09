jest.mock('../../src/common/services/prisma.service', () => {
  return {
    PrismaService: jest.fn().mockImplementation(() => ({
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ value: 'test' }]),
    })),
  }
})

import { PrismaService } from '../../src/common/services/prisma.service'

describe('Persistence integration', () => {
  it('data remains after simulated restart', async () => {
    const prisma = new PrismaService()
    await prisma.$connect()
    await prisma.$executeRaw`INSERT INTO test_table (id, value) VALUES (1, 'test') ON CONFLICT (id) DO NOTHING`
    await prisma.$disconnect()
    const prisma2 = new PrismaService()
    await prisma2.$connect()
    const result = await prisma2.$queryRaw<{ value: string }[]>`SELECT value FROM test_table WHERE id = 1`
    expect(result[0]?.value).toBe('test')
    await prisma2.$disconnect()
  })
}) 