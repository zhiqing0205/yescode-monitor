import { PrismaClient } from '@prisma/client'

// 强制创建新的Prisma实例，禁用prepared statements避免缓存问题
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?pgbouncer=true&connection_limit=1&prepared_statements=false'
    }
  }
})