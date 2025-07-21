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

// JWT解析相关函数
function base64UrlDecode(str: string): string {
  // 替换 Base64 URL 字符
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  
  // 添加必要的填充
  while (str.length % 4) {
    str += '='
  }
  
  return Buffer.from(str, 'base64').toString('utf8')
}

function parseJWT(token: string) {
  try {
    const parts = token.split('.')
    
    if (parts.length !== 3) {
      throw new Error('JWT 格式无效，应该包含3个部分（header.payload.signature）')
    }

    const [headerEncoded, payloadEncoded, signature] = parts
    
    // 解码 header 和 payload
    const header = JSON.parse(base64UrlDecode(headerEncoded))
    const payload = JSON.parse(base64UrlDecode(payloadEncoded))
    
    return { header, payload, signature }
  } catch (error) {
    throw new Error(`JWT 解析失败: ${error instanceof Error ? error.message : error}`)
  }
}

function getTokenExpirationInfo(token: string | undefined) {
  if (!token) {
    return {
      isValid: false,
      daysRemaining: 0,
      expirationDate: null,
      expirationTime: null,
      error: 'Token不存在'
    }
  }

  try {
    const { payload } = parseJWT(token)
    
    if (!payload.exp) {
      return {
        isValid: true,
        daysRemaining: Infinity,
        expirationDate: null,
        expirationTime: null,
        error: null
      }
    }

    const expirationDate = new Date(payload.exp * 1000)
    const now = new Date()
    const diffMs = expirationDate.getTime() - now.getTime()
    const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    // 转换为东八区时间显示
    const chinaExpirationTime = DateTime.fromJSDate(expirationDate).setZone(CHINA_TIMEZONE)
    
    return {
      isValid: diffMs > 0,
      daysRemaining: Math.max(0, daysRemaining),
      expirationDate: chinaExpirationTime.toFormat('yyyy-MM-dd'),
      expirationTime: chinaExpirationTime.toFormat('HH:mm:ss'),
      error: null
    }
  } catch (error) {
    return {
      isValid: false,
      daysRemaining: 0,
      expirationDate: null,
      expirationTime: null,
      error: error instanceof Error ? error.message : 'Token解析失败'
    }
  }
}

export async function GET() {
  try {
    // 获取东八区的今天范围，然后转换为UTC用于数据库查询
    const nowChina = DateTime.now().setZone(CHINA_TIMEZONE)
    const todayStartChina = nowChina.startOf('day')
    const todayEndChina = nowChina.endOf('day')
    const yesterdayStartChina = nowChina.minus({ days: 1 }).startOf('day')
    const yesterdayEndChina = nowChina.minus({ days: 1 }).endOf('day')
    
    // 转换为UTC时间范围用于查询数据库 - 包含今日和昨日
    const yesterdayStartUTC = yesterdayStartChina.toUTC().toJSDate()
    const todayEndUTC = todayEndChina.toUTC().toJSDate()
    
    console.log(`东八区查询范围: ${yesterdayStartChina.toISO()} 到 ${todayEndChina.toISO()}`)
    console.log(`UTC查询范围: ${yesterdayStartUTC.toISOString()} 到 ${todayEndUTC.toISOString()}`)
    
    const todayRecords = await prisma.usageRecord.findMany({
      where: {
        timestamp: {
          gte: yesterdayStartUTC,
          lte: todayEndUTC
        }
      },
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

    // 获取JWT token信息
    const jwtToken = process.env.PACKYCODE_JWT_TOKEN
    const tokenInfo = getTokenExpirationInfo(jwtToken)

    // 序列化数据，处理BigInt
    const serializedData = {
      todayRecords: serializeBigInt(todayRecords),
      monthlyStats: serializeBigInt(monthlyStats),
      todayStats: serializeBigInt(todayStats),
      latestRecord: serializeBigInt(latestRecord),
      tokenInfo: tokenInfo
    }

    console.log(`Found ${todayRecords.length} records for today and yesterday (China timezone)`)

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