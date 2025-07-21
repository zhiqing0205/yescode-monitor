import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { DateTime } from 'luxon'
import { prisma } from '@/lib/prisma'

const CHINA_TIMEZONE = 'Asia/Shanghai'
const BARK_URL = process.env.BARK_URL

// JWT解析相关函数
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  
  while (str.length % 4) {
    str += '='
  }
  
  return Buffer.from(str, 'base64').toString('utf8')
}

function parseJWT(token: string) {
  try {
    const parts = token.split('.')
    
    if (parts.length !== 3) {
      throw new Error('JWT 格式无效')
    }

    const [headerEncoded, payloadEncoded] = parts
    
    const header = JSON.parse(base64UrlDecode(headerEncoded))
    const payload = JSON.parse(base64UrlDecode(payloadEncoded))
    
    return { header, payload }
  } catch (error) {
    throw new Error(`JWT 解析失败: ${error instanceof Error ? error.message : error}`)
  }
}

function shouldSendNotification(expirationDate: Date): boolean {
  const now = DateTime.now().setZone(CHINA_TIMEZONE)
  const expiration = DateTime.fromJSDate(expirationDate).setZone(CHINA_TIMEZONE)
  
  // 计算距离到期的天数
  const diffDays = Math.floor(expiration.diff(now, 'days').days)
  
  // 检查是否是到期前一天
  if (diffDays === 1) {
    // 检查当前时间是否是中午12点左右（11:00-13:00之间）
    const currentHour = now.hour
    return currentHour >= 11 && currentHour <= 13
  }
  
  return false
}

function shouldSendSubscriptionNotification(planExpiresAt: string): boolean {
  const now = DateTime.now().setZone(CHINA_TIMEZONE)
  const expiration = DateTime.fromISO(planExpiresAt).setZone(CHINA_TIMEZONE)
  
  // 计算距离到期的天数
  const diffDays = Math.floor(expiration.diff(now, 'days').days)
  
  // 检查是否是到期前一天
  if (diffDays === 1) {
    // 检查当前时间是否是中午12点左右（11:00-13:00之间）
    const currentHour = now.hour
    return currentHour >= 11 && currentHour <= 13
  }
  
  return false
}

async function sendBarkNotification(title: string, body: string, url?: string) {
  if (!BARK_URL) {
    throw new Error('BARK_URL 未配置')
  }

  const notification = {
    title,
    body,
    sound: 'alarm',
    badge: 1,
    ...(url && { url })
  }

  try {
    const response = await fetch(BARK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification)
    })

    if (!response.ok) {
      throw new Error(`Bark API 响应错误: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    throw new Error(`发送通知失败: ${error instanceof Error ? error.message : error}`)
  }
}

export async function POST() {
  try {
    // 检查API密钥认证
    const authHeader = headers().get('authorization')
    const apiSecret = process.env.API_SECRET
    
    if (!authHeader || !apiSecret) {
      return NextResponse.json(
        { success: false, error: '认证信息缺失' },
        { status: 401 }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    if (token !== apiSecret) {
      return NextResponse.json(
        { success: false, error: '认证失败' },
        { status: 401 }
      )
    }

    const notifications = []
    let jwtNotificationSent = false
    let subscriptionNotificationSent = false

    // 1. 检查JWT Token到期通知
    const jwtToken = process.env.PACKYCODE_JWT_TOKEN
    
    if (jwtToken) {
      try {
        const { payload } = parseJWT(jwtToken)
        
        if (payload.exp) {
          const expirationDate = new Date(payload.exp * 1000)
          
          if (shouldSendNotification(expirationDate)) {
            const expiration = DateTime.fromJSDate(expirationDate).setZone(CHINA_TIMEZONE)
            const title = '🚨 PackyCode Token 即将到期提醒'
            const body = `您的 PackyCode JWT Token 将于明天 ${expiration.toFormat('HH:mm')} 到期，请及时续期以避免服务中断。`
            
            const result = await sendBarkNotification(title, body)
            notifications.push({
              type: 'JWT Token',
              result,
              expirationTime: expiration.toFormat('yyyy-MM-dd HH:mm:ss')
            })
            jwtNotificationSent = true
          }
        }
      } catch (error) {
        console.error('JWT Token 通知检查失败:', error)
      }
    }

    // 2. 检查订阅到期通知
    try {
      const latestRecord = await prisma.usageRecord.findFirst({
        orderBy: { timestamp: 'desc' }
      })

      if (latestRecord && latestRecord.planExpiresAt) {
        const planExpiresAt = latestRecord.planExpiresAt.toISOString()
        
        if (shouldSendSubscriptionNotification(planExpiresAt)) {
          const expiration = DateTime.fromJSDate(latestRecord.planExpiresAt).setZone(CHINA_TIMEZONE)
          const title = '🚨 PackyCode 订阅即将到期提醒'
          const body = `您的 PackyCode ${latestRecord.planType?.toUpperCase() || 'PRO'} 订阅将于明天 ${expiration.toFormat('HH:mm')} 到期，请及时续费以避免服务中断。`
          
          const result = await sendBarkNotification(title, body)
          notifications.push({
            type: 'Subscription',
            planType: latestRecord.planType,
            result,
            expirationTime: expiration.toFormat('yyyy-MM-dd HH:mm:ss')
          })
          subscriptionNotificationSent = true
        }
      }
    } catch (error) {
      console.error('订阅通知检查失败:', error)
    }

    // 返回结果
    if (notifications.length > 0) {
      return NextResponse.json({
        success: true,
        message: `成功发送 ${notifications.length} 条通知`,
        notifications,
        jwtNotificationSent,
        subscriptionNotificationSent
      })
    } else {
      const now = DateTime.now().setZone(CHINA_TIMEZONE)
      return NextResponse.json({
        success: true,
        message: '当前无需发送通知',
        jwtNotificationSent: false,
        subscriptionNotificationSent: false,
        currentTime: now.toFormat('yyyy-MM-dd HH:mm:ss')
      })
    }

  } catch (error) {
    console.error('发送通知失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '发送通知失败' 
      },
      { status: 500 }
    )
  }
}

// GET 方法用于手动触发或测试通知
export async function GET() {
  return POST()
}