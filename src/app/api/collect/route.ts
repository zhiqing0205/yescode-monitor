import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchPackyCodeUserInfo, sendBarkNotification } from '@/lib/packycode'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET() {
  try {
    const userInfo = await fetchPackyCodeUserInfo()
    
    const usageRecord = await prisma.usageRecord.create({
      data: {
        balanceUsd: new Decimal(userInfo.balance_usd),
        totalSpentUsd: new Decimal(userInfo.total_spent_usd),
        dailySpentUsd: new Decimal(userInfo.daily_spent_usd),
        monthlySpentUsd: new Decimal(userInfo.monthly_spent_usd),
        totalQuota: userInfo.total_quota,
        usedQuota: userInfo.used_quota,
        remainingQuota: userInfo.remaining_quota,
        planType: userInfo.plan_type,
        planExpiresAt: new Date(userInfo.plan_expires_at),
        monthlyBudgetUsd: new Decimal(userInfo.monthly_budget_usd),
        dailyBudgetUsd: new Decimal(userInfo.daily_budget_usd),
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let dailyStats = await prisma.dailyStats.findUnique({
      where: { date: today }
    })

    if (!dailyStats) {
      dailyStats = await prisma.dailyStats.create({
        data: {
          date: today,
          startBalance: new Decimal(userInfo.daily_budget_usd),
          endBalance: new Decimal(userInfo.balance_usd),
          totalUsed: new Decimal(userInfo.daily_spent_usd),
          usagePercentage: parseFloat(userInfo.daily_spent_usd) / parseFloat(userInfo.daily_budget_usd) * 100,
        },
      })
    } else {
      const usagePercentage = parseFloat(userInfo.daily_spent_usd) / parseFloat(userInfo.daily_budget_usd) * 100
      
      dailyStats = await prisma.dailyStats.update({
        where: { id: dailyStats.id },
        data: {
          endBalance: new Decimal(userInfo.balance_usd),
          totalUsed: new Decimal(userInfo.daily_spent_usd),
          usagePercentage,
        },
      })

      if (usagePercentage >= 50 && !dailyStats.notified50) {
        await sendBarkNotification(
          'PackyCode Usage Alert',
          `Daily usage has reached ${usagePercentage.toFixed(1)}% (50% threshold)`,
          'packycode'
        )
        await prisma.dailyStats.update({
          where: { id: dailyStats.id },
          data: { notified50: true }
        })
      } else if (usagePercentage >= 80 && !dailyStats.notified80) {
        await sendBarkNotification(
          'PackyCode Usage Alert',
          `Daily usage has reached ${usagePercentage.toFixed(1)}% (80% threshold)`,
          'packycode'
        )
        await prisma.dailyStats.update({
          where: { id: dailyStats.id },
          data: { notified80: true }
        })
      } else if (usagePercentage >= 95 && !dailyStats.notified95) {
        await sendBarkNotification(
          'PackyCode Usage Critical',
          `Daily usage has reached ${usagePercentage.toFixed(1)}% (95% threshold)`,
          'packycode'
        )
        await prisma.dailyStats.update({
          where: { id: dailyStats.id },
          data: { notified95: true }
        })
      }
    }

    await prisma.systemLog.create({
      data: {
        type: 'SUCCESS',
        message: 'Successfully fetched and recorded PackyCode usage data',
        details: JSON.stringify({ userId: userInfo.user_id, balance: userInfo.balance_usd }),
      },
    })

    return NextResponse.json({
      success: true,
      data: userInfo,
      recordId: usageRecord.id
    })
  } catch (error) {
    console.error('Error fetching PackyCode data:', error)
    
    await prisma.systemLog.create({
      data: {
        type: 'ERROR',
        message: 'Failed to fetch PackyCode usage data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    await sendBarkNotification(
      'PackyCode Monitor Error',
      `Failed to fetch usage data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'packycode'
    )

    return NextResponse.json(
      { success: false, error: 'Failed to fetch PackyCode data' },
      { status: 500 }
    )
  }
}