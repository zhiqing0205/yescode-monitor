// scripts/backup-data.js
// 数据备份脚本，在重构表结构前备份所有数据

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function backupData() {
  try {
    console.log('🔄 开始备份数据...')
    
    // 备份 UsageRecord 表
    const usageRecords = await prisma.usageRecord.findMany({
      orderBy: { timestamp: 'asc' }
    })
    console.log(`📊 UsageRecord: ${usageRecords.length} 条记录`)
    
    // 备份 DailyStats 表
    const dailyStats = await prisma.dailyStats.findMany({
      orderBy: { date: 'asc' }
    })
    console.log(`📈 DailyStats: ${dailyStats.length} 条记录`)
    
    // 备份 SystemLog 表
    const systemLogs = await prisma.systemLog.findMany({
      orderBy: { timestamp: 'asc' }
    })
    console.log(`📝 SystemLog: ${systemLogs.length} 条记录`)
    
    // 创建备份目录
    const backupDir = path.join(process.cwd(), 'backup')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir)
    }
    
    // 生成备份文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupData = {
      timestamp,
      usageRecords,
      dailyStats,
      systemLogs
    }
    
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`)
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))
    
    console.log(`✅ 数据备份完成: ${backupFile}`)
    console.log(`📦 总计: ${usageRecords.length + dailyStats.length + systemLogs.length} 条记录`)
    
    return backupFile
  } catch (error) {
    console.error('❌ 备份失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  backupData()
}

module.exports = { backupData }