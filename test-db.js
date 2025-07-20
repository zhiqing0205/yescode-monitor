const { PrismaClient } = require('@prisma/client')

async function testConnection() {
  const prisma = new PrismaClient()
  
  try {
    console.log('测试数据库连接...')
    
    // 简单的计数查询
    const count = await prisma.usageRecord.count()
    console.log(`✅ UsageRecord 计数: ${count}`)
    
    // 尝试查询一条记录
    const latest = await prisma.usageRecord.findFirst({
      orderBy: { id: 'desc' }
    })
    
    if (latest) {
      console.log(`✅ 最新记录 ID: ${latest.id}`)
      console.log(`✅ 时间戳: ${latest.timestamp}`)
    }
    
    console.log('✅ 数据库连接正常')
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message)
    console.error('错误详情:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()