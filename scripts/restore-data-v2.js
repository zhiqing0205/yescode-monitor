const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const { DateTime } = require('luxon')

const prisma = new PrismaClient()

// 东八区时区标识
const CHINA_TIMEZONE = 'Asia/Shanghai'

/**
 * 将原始时间戳正确转换为UTC时间
 * 原始数据中的时间戳实际上是按东八区录入的，现在要确保正确存储为UTC
 */
function normalizeToUTC(timestamp) {
  // 将时间戳作为东八区时间解析，然后转换为UTC
  const chinaTime = DateTime.fromJSDate(new Date(timestamp)).setZone(CHINA_TIMEZONE, { keepLocalTime: true })
  return chinaTime.toUTC().toJSDate()
}

async function restoreData() {
  try {
    console.log('开始恢复数据到新的UTC表结构...')
    
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
        // 确保时间戳正确存储为UTC
        const utcTimestamp = normalizeToUTC(record.timestamp)
        const utcCreatedAt = normalizeToUTC(record.createdAt)
        const utcPlanExpiresAt = normalizeToUTC(record.planExpiresAt)
        
        await prisma.usageRecord.create({
          data: {
            timestamp: utcTimestamp,
            balanceUsd: record.balanceUsd,
            totalSpentUsd: record.totalSpentUsd,
            dailySpentUsd: record.dailySpentUsd,
            monthlySpentUsd: record.monthlySpentUsd,
            totalQuota: record.totalQuota,
            usedQuota: record.usedQuota,
            remainingQuota: record.remainingQuota,
            planType: record.planType,
            planExpiresAt: utcPlanExpiresAt,
            monthlyBudgetUsd: record.monthlyBudgetUsd,
            dailyBudgetUsd: record.dailyBudgetUsd,
            createdAt: utcCreatedAt,
          },
        })
      }
      console.log('✅ UsageRecord数据恢复完成')
    }
    
    // 恢复DailyStats数据
    if (backupData.dailyStats && backupData.dailyStats.length > 0) {
      console.log(`恢复 ${backupData.dailyStats.length} 条DailyStats记录...`)
      
      for (const stat of backupData.dailyStats) {
        // 对于date字段，确保使用日期部分（按东八区）
        const chinaDate = DateTime.fromJSDate(new Date(stat.date)).setZone(CHINA_TIMEZONE, { keepLocalTime: true })
        const dateOnly = chinaDate.startOf('day').toJSDate()
        
        const utcCreatedAt = normalizeToUTC(stat.createdAt)
        const utcUpdatedAt = normalizeToUTC(stat.updatedAt)
        
        await prisma.dailyStats.create({
          data: {
            date: dateOnly,
            startBalance: stat.startBalance,
            endBalance: stat.endBalance,
            totalUsed: stat.totalUsed,
            usagePercentage: stat.usagePercentage,
            notified50: stat.notified50,
            notified80: stat.notified80,
            notified95: stat.notified95,
            createdAt: utcCreatedAt,
            updatedAt: utcUpdatedAt,
          },
        })
      }
      console.log('✅ DailyStats数据恢复完成')
    }
    
    // 恢复SystemLog数据
    if (backupData.systemLogs && backupData.systemLogs.length > 0) {
      console.log(`恢复 ${backupData.systemLogs.length} 条SystemLog记录...`)
      
      for (const log of backupData.systemLogs) {
        // 确保时间戳正确存储为UTC
        const utcTimestamp = normalizeToUTC(log.timestamp)
        const utcCreatedAt = normalizeToUTC(log.createdAt)
        
        await prisma.systemLog.create({
          data: {
            timestamp: utcTimestamp,
            type: log.type,
            message: log.message,
            details: log.details,
            createdAt: utcCreatedAt,
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
    
    // 显示时区验证信息
    console.log('\n🕐 时区验证:')
    const latestUsage = await prisma.usageRecord.findFirst({
      orderBy: { id: 'desc' }
    })
    
    if (latestUsage) {
      console.log(`最新记录UTC时间: ${latestUsage.timestamp.toISOString()}`)
      const chinaTime = DateTime.fromJSDate(latestUsage.timestamp).setZone(CHINA_TIMEZONE)
      console.log(`转换为东八区时间: ${chinaTime.toISO()}`)
    }
    
    console.log('\n✅ 数据恢复完成！所有数据已按照UTC格式正确存储。')
    
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