import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DateTime } from 'luxon'

const CHINA_TIMEZONE = 'Asia/Shanghai'

// 将BigInt、Decimal和Date转换为字符串以便JSON序列化
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj
  
  if (typeof obj === 'bigint') {
    return obj.toString()
  }
  
  // 处理Prisma的Decimal类型 - 更精确的检测
  if (obj && typeof obj === 'object' && 
      (obj.constructor?.name === 'Decimal' || 
       obj.hasOwnProperty('d') && obj.hasOwnProperty('e') && obj.hasOwnProperty('s'))) {
    return obj.toString()
  }
  
  // 处理Date类型
  if (obj instanceof Date) {
    return obj.toISOString()
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt)
  }
  
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInt(value)
    }
    return result
  }
  
  return obj
}


export async function GET() {
  try {
    // 获取东八区的今天范围，然后转换为UTC用于数据库查询
    const nowChina = DateTime.now().setZone(CHINA_TIMEZONE)
    const todayStartChina = nowChina.startOf('day')
    const todayEndChina = nowChina.endOf('day')
    
    // 查询所有历史数据以支持日历显示和历史数据查看
    console.log(`查询所有 UsageRecord 历史数据`)
    
    const todayRecords = await prisma.usageRecord.findMany({
      orderBy: { timestamp: 'asc' }
    })

    console.log(`原始记录数量: ${todayRecords.length}`)
    if (todayRecords.length > 0) {
      console.log(`第一条记录: ID=${todayRecords[0].id}, timestamp=${todayRecords[0].timestamp.toISOString()}`)
      console.log(`最后一条记录: ID=${todayRecords[todayRecords.length - 1].id}, timestamp=${todayRecords[todayRecords.length - 1].timestamp.toISOString()}`)
    }

    // 对于DailyStats，使用东八区的日期
    const chinaDateOnly = todayStartChina.toFormat('yyyy-MM-dd')
    console.log(`查询DailyStats日期: ${chinaDateOnly}`)
    
    const todayStats = await prisma.dailyStats.findUnique({
      where: { date: new Date(chinaDateOnly) }
    })

    console.log(`DailyStats查询结果: ${todayStats ? `ID=${todayStats.id}` : '无'}`)

    const latestRecord = await prisma.usageRecord.findFirst({
      orderBy: { timestamp: 'desc' }
    })

    console.log(`最新记录: ${latestRecord ? `ID=${latestRecord.id}` : '无'}`)

    // 获取近30天的DailyStats数据用于月度视图
    const thirtyDaysAgoChina = todayStartChina.minus({ days: 30 })
    const thirtyDaysAgoDate = new Date(thirtyDaysAgoChina.toFormat('yyyy-MM-dd'))
    const todayDate = new Date(todayStartChina.toFormat('yyyy-MM-dd'))
    
    console.log(`30天DailyStats查询范围: ${thirtyDaysAgoChina.toFormat('yyyy-MM-dd')} 到 ${todayStartChina.toFormat('yyyy-MM-dd')}`)
    
    const monthlyStats = await prisma.dailyStats.findMany({
      where: {
        date: {
          gte: thirtyDaysAgoDate,
          lte: todayDate
        }
      },
      orderBy: { date: 'asc' }
    })

    console.log(`30天DailyStats记录数量: ${monthlyStats.length}`)

    // 序列化数据，处理BigInt
    const serializedData = {
      todayRecords: serializeBigInt(todayRecords),
      monthlyStats: serializeBigInt(monthlyStats),
      todayStats: serializeBigInt(todayStats),
      latestRecord: serializeBigInt(latestRecord)
    }

    console.log(`Found ${todayRecords.length} total historical records`)

    return NextResponse.json({
      success: true,
      data: serializedData
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}