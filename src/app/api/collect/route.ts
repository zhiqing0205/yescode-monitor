import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchYesCodeUserInfo, sendBarkNotification } from '@/lib/packycode'
import { Decimal } from '@prisma/client/runtime/library'
import { DateTime } from 'luxon'

const CHINA_TIMEZONE = 'Asia/Shanghai'

// 序列化BigInt、Decimal和Date类型
function serializeData(obj: any): any {
  if (obj === null || obj === undefined) return obj
  
  if (typeof obj === 'bigint') {
    return obj.toString()
  }
  
  if (obj && typeof obj === 'object' && 
      (obj.constructor?.name === 'Decimal' || 
       obj.hasOwnProperty('d') && obj.hasOwnProperty('e') && obj.hasOwnProperty('s'))) {
    return obj.toString()
  }
  
  if (obj instanceof Date) {
    return obj.toISOString()
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeData)
  }
  
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeData(value)
    }
    return result
  }
  
  return obj
}

// 验证API密钥
function validateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const apiSecret = process.env.API_SECRET
  
  if (!apiSecret) {
    throw new Error('API_SECRET not configured')
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }
  
  const token = authHeader.substring(7)
  if (token !== apiSecret) {
    throw new Error('Invalid API secret')
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting collect API request...')
    
    // 验证API密钥
    try {
      validateApiKey(request)
      console.log('API key validation successful')
    } catch (error) {
      console.error('API key validation failed:', error)
      throw error
    }
    
    console.log('Fetching YesCode user info...')
    const userInfo = await fetchYesCodeUserInfo()
    console.log('YesCode user info fetched successfully:', { userId: userInfo.id })
    
    console.log('Creating usage record...')
    const usageRecord = await prisma.usageRecord.create({
      data: {
        userId: userInfo.id,
        balance: new Decimal(userInfo.balance),
        subscriptionPlanId: userInfo.subscription_plan_id,
        subscriptionExpiry: new Date(userInfo.subscription_expiry),
        currentMonthSpend: new Decimal(userInfo.current_month_spend),
        planName: userInfo.subscription_plan.name,
        dailyBalance: new Decimal(userInfo.subscription_plan.daily_balance),
        monthlySpendLimit: new Decimal(userInfo.subscription_plan.monthly_spend_limit),
      },
    })
    console.log('Usage record created successfully:', { recordId: usageRecord.id.toString() })

    // 使用东八区时间确定今天的日期，用于DailyStats查询
    const nowChina = DateTime.now().setZone(CHINA_TIMEZONE)
    const todayChina = nowChina.startOf('day')
    const chinaDateOnly = todayChina.toFormat('yyyy-MM-dd')
    console.log('Processing daily stats for date:', chinaDateOnly)
    
    let dailyStats = await prisma.dailyStats.findUnique({
      where: { date: new Date(chinaDateOnly) }
    })

    // 计算每日余额使用百分比：(每日配额 - 当前余额) / 每日配额 * 100
    const dailyQuota = userInfo.subscription_plan.daily_balance
    const currentBalance = userInfo.balance
    const dailyUsed = Math.max(0, dailyQuota - currentBalance) // 防止负数
    const dailyUsagePercentage = (dailyUsed / dailyQuota) * 100
    
    if (!dailyStats) {
      console.log('Creating new daily stats record...')
      dailyStats = await prisma.dailyStats.create({
        data: {
          date: new Date(chinaDateOnly),
          startBalance: new Decimal(dailyQuota), // 每日开始时的配额
          endBalance: new Decimal(currentBalance), // 当前余额
          dailyAllowance: new Decimal(dailyQuota), // 每日配额
          currentSpend: new Decimal(dailyUsed), // 当日已使用
          usagePercentage: dailyUsagePercentage,
        },
      })
      console.log('New daily stats record created:', { statsId: dailyStats.id.toString() })
    } else {
      console.log('Updating existing daily stats record...', { statsId: dailyStats.id.toString() })
      
      dailyStats = await prisma.dailyStats.update({
        where: { id: dailyStats.id },
        data: {
          endBalance: new Decimal(currentBalance),
          currentSpend: new Decimal(dailyUsed),
          usagePercentage: dailyUsagePercentage,
        },
      })
      console.log('Daily stats updated, daily usage percentage:', dailyUsagePercentage.toFixed(2) + '%')

      // 检查通知阈值 - 基于每日余额使用百分比
      if (dailyUsagePercentage >= 50 && !dailyStats.notified50) {
        console.log('Sending 50% threshold notification...')
        await sendBarkNotification(
          'YesCode Usage Alert',
          `Daily balance usage has reached ${dailyUsagePercentage.toFixed(1)}% (50% threshold)`,
          'yescode'
        )
        await prisma.dailyStats.update({
          where: { id: dailyStats.id },
          data: { notified50: true }
        })
      } else if (dailyUsagePercentage >= 80 && !dailyStats.notified80) {
        console.log('Sending 80% threshold notification...')
        await sendBarkNotification(
          'YesCode Usage Alert',
          `Daily balance usage has reached ${dailyUsagePercentage.toFixed(1)}% (80% threshold)`,
          'yescode'
        )
        await prisma.dailyStats.update({
          where: { id: dailyStats.id },
          data: { notified80: true }
        })
      } else if (dailyUsagePercentage >= 95 && !dailyStats.notified95) {
        console.log('Sending 95% threshold notification...')
        await sendBarkNotification(
          'YesCode Usage Critical',
          `Daily balance usage has reached ${dailyUsagePercentage.toFixed(1)}% (95% threshold)`,
          'yescode'
        )
        await prisma.dailyStats.update({
          where: { id: dailyStats.id },
          data: { notified95: true }
        })
      }
    }

    console.log('Creating system log...')
    await prisma.systemLog.create({
      data: {
        type: 'SUCCESS',
        message: 'Successfully fetched and recorded YesCode usage data',
        details: JSON.stringify({ userId: userInfo.id, balance: userInfo.balance }),
      },
    })

    console.log('Collect API completed successfully')
    return NextResponse.json({
      success: true,
      data: userInfo,
      recordId: serializeData(usageRecord.id)
    })
  } catch (error) {
    console.error('Error in collect API:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    try {
      await prisma.systemLog.create({
        data: {
          type: 'ERROR',
          message: 'Failed to fetch YesCode usage data',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    } catch (logError) {
      console.error('Failed to create system log:', logError)
    }

    if (error instanceof Error && error.message.includes('API')) {
      console.log('Returning 401 unauthorized response')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    try {
      await sendBarkNotification(
        'YesCode Monitor Error',
        `Failed to fetch usage data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'yescode'
      )
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError)
    }

    console.log('Returning 500 server error response')
    return NextResponse.json(
      { success: false, error: 'Failed to fetch YesCode data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}