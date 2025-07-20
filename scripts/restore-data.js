const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const { DateTime } = require('luxon')

const prisma = new PrismaClient()

// 东八区时区标识
const CHINA_TIMEZONE = 'Asia/Shanghai'

/**
 * 将UTC时间戳转换为东八区时间后再转回UTC（用于修正时区偏移）
 * 这个函数处理原本以UTC存储但实际是东八区时间的数据
 */
function correctTimezoneToChina(utcTimestamp) {
  // 将原始UTC时间戳作为东八区时间解析
  const chinaTime = DateTime.fromJSDate(new Date(utcTimestamp)).setZone(CHINA_TIMEZONE, { keepLocalTime: true })
  
  // 转换为正确的UTC时间存储
  return chinaTime.toUTC().toJSDate()
}

async function restoreData() {
  try {
    console.log('开始恢复数据...')
    
    // 读取备份文件
    const backupFile = path.join(__dirname, '..', 'backup', 'backup-2025-07-20T07-23-06-459Z.json')
    
    if (!fs.existsSync(backupFile)) {
      throw new Error(`备份文件不存在: ${backupFile}`)
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'))
    
    // 恢复UsageRecord数据
    if (backupData.usageRecords && backupData.usageRecords.length > 0) {
      console.log(`恢复 ${backupData.usageRecords.length} 条UsageRecord记录...`)
      
      for (const record of backupData.usageRecords) {
        // 转换时区
        const correctedTimestamp = correctTimezoneToChina(record.timestamp)
        const correctedCreatedAt = correctTimezoneToChina(record.createdAt)
        
        await prisma.usageRecord.create({
          data: {
            timestamp: correctedTimestamp,
            balanceUsd: record.balanceUsd,
            totalSpentUsd: record.totalSpentUsd,
            dailySpentUsd: record.dailySpentUsd,
            monthlySpentUsd: record.monthlySpentUsd,
            totalQuota: record.totalQuota,
            usedQuota: record.usedQuota,
            remainingQuota: record.remainingQuota,
            planType: record.planType,
            planExpiresAt: new Date(record.planExpiresAt),
            monthlyBudgetUsd: record.monthlyBudgetUsd,
            dailyBudgetUsd: record.dailyBudgetUsd,
            createdAt: correctedCreatedAt,
          },
        })
      }
      console.log('✅ UsageRecord数据恢复完成')
    }
    
    // 恢复DailyStats数据
    if (backupData.dailyStats && backupData.dailyStats.length > 0) {
      console.log(`恢复 ${backupData.dailyStats.length} 条DailyStats记录...`)
      
      for (const stat of backupData.dailyStats) {
        // 转换时区
        const correctedDate = correctTimezoneToChina(stat.date)
        const correctedCreatedAt = correctTimezoneToChina(stat.createdAt)
        const correctedUpdatedAt = correctTimezoneToChina(stat.updatedAt)
        
        await prisma.dailyStats.create({
          data: {
            date: correctedDate,
            startBalance: stat.startBalance,
            endBalance: stat.endBalance,
            totalUsed: stat.totalUsed,
            usagePercentage: stat.usagePercentage,
            notified50: stat.notified50,
            notified80: stat.notified80,
            notified95: stat.notified95,
            createdAt: correctedCreatedAt,
            updatedAt: correctedUpdatedAt,
          },
        })
      }
      console.log('✅ DailyStats数据恢复完成')
    }
    
    // 恢复SystemLog数据
    if (backupData.systemLogs && backupData.systemLogs.length > 0) {
      console.log(`恢复 ${backupData.systemLogs.length} 条SystemLog记录...`)
      
      for (const log of backupData.systemLogs) {
        // 转换时区
        const correctedTimestamp = correctTimezoneToChina(log.timestamp)
        const correctedCreatedAt = correctTimezoneToChina(log.createdAt)
        
        await prisma.systemLog.create({
          data: {
            timestamp: correctedTimestamp,
            type: log.type,
            message: log.message,
            details: log.details,
            createdAt: correctedCreatedAt,
          },
        })
      }
      console.log('✅ SystemLog数据恢复完成')
    }
    
    // 验证恢复的数据
    console.log('\n📊 数据恢复验证:')
    const usageCount = await prisma.usageRecord.count()
    const dailyCount = await prisma.dailyStats.count()
    const logCount = await prisma.systemLog.count()
    
    console.log(`- UsageRecord: ${usageCount} 条`)
    console.log(`- DailyStats: ${dailyCount} 条`)
    console.log(`- SystemLog: ${logCount} 条`)
    console.log(`- 总计: ${usageCount + dailyCount + logCount} 条`)
    
    // 显示最新的几条记录的时区信息
    console.log('\n🕐 时区验证（显示最新记录的时间）:')
    const latestUsage = await prisma.usageRecord.findFirst({
      orderBy: { timestamp: 'desc' }
    })
    
    if (latestUsage) {
      const chinaTime = DateTime.fromJSDate(latestUsage.timestamp).setZone(CHINA_TIMEZONE)
      console.log(`最新UsageRecord: ${chinaTime.toISO()} (东八区)`)
      console.log(`原始UTC时间: ${latestUsage.timestamp.toISOString()}`)
    }
    
    console.log('\n✅ 数据恢复完成！所有数据已按照东八区时间正确恢复。')
    
  } catch (error) {
    console.error('❌ 数据恢复失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 运行恢复脚本
restoreData()
  .then(() => {
    console.log('🎉 恢复脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 恢复脚本执行失败:', error)
    process.exit(1)
  })