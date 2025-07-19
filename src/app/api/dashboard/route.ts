import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayRecords = await prisma.usageRecord.findMany({
      where: {
        timestamp: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    const todayStats = await prisma.dailyStats.findUnique({
      where: { date: today }
    })

    const latestRecord = await prisma.usageRecord.findFirst({
      orderBy: { timestamp: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: {
        todayRecords,
        todayStats,
        latestRecord
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}