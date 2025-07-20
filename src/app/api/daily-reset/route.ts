import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBarkNotification } from '@/lib/packycode'

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
    // 验证API密钥
    validateApiKey(request)
    
    // 直接使用本地时间，因为环境已经是东八区
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const yesterdayStats = await prisma.dailyStats.findUnique({
      where: { date: yesterday }
    })

    if (yesterdayStats) {
      const usageAmount = yesterdayStats.totalUsed.toNumber()
      const usagePercentage = yesterdayStats.usagePercentage

      await sendBarkNotification(
        'PackyCode Daily Summary',
        `Yesterday's usage: $${usageAmount.toFixed(4)} (${usagePercentage.toFixed(1)}%)`,
        'packycode'
      )

      await prisma.systemLog.create({
        data: {
          type: 'DAILY_RESET',
          message: 'Daily reset completed and summary sent',
          details: JSON.stringify({
            date: yesterday.toISOString(),
            usage: usageAmount,
            percentage: usagePercentage
          }),
        },
      })
    }

    await prisma.dailyStats.upsert({
      where: { date: today },
      update: {
        notified50: false,
        notified80: false,
        notified95: false,
      },
      create: {
        date: today,
        startBalance: 25.0,
        endBalance: 25.0,
        totalUsed: 0.0,
        usagePercentage: 0.0,
        notified50: false,
        notified80: false,
        notified95: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Daily reset completed successfully'
    })
  } catch (error) {
    console.error('Error during daily reset:', error)
    
    await prisma.systemLog.create({
      data: {
        type: 'ERROR',
        message: 'Failed to perform daily reset',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    if (error instanceof Error && error.message.includes('API')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await sendBarkNotification(
      'PackyCode Monitor Error',
      `Daily reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'packycode'
    )

    return NextResponse.json(
      { success: false, error: 'Failed to perform daily reset' },
      { status: 500 }
    )
  }
}