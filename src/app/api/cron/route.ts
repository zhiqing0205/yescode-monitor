import { NextRequest, NextResponse } from 'next/server'
import { cronManager } from '@/lib/cron'

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

// GET - 获取cron任务状态
export async function GET(request: NextRequest) {
  try {
    validateApiKey(request)
    
    const status = cronManager.status()
    
    return NextResponse.json({
      success: true,
      data: status,
      message: 'Cron jobs status retrieved successfully'
    })
  } catch (error) {
    console.error('Error getting cron status:', error)
    
    if (error instanceof Error && error.message.includes('API')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get cron status' },
      { status: 500 }
    )
  }
}

// POST - 控制cron任务
export async function POST(request: NextRequest) {
  try {
    validateApiKey(request)
    
    const body = await request.json()
    const { action } = body
    
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'init':
        cronManager.initialize()
        return NextResponse.json({
          success: true,
          message: 'Cron jobs initialized successfully'
        })
        
      case 'start':
        cronManager.start()
        return NextResponse.json({
          success: true,
          message: 'Cron jobs started successfully'
        })
        
      case 'stop':
        cronManager.stop()
        return NextResponse.json({
          success: true,
          message: 'Cron jobs stopped successfully'
        })
        
      case 'restart':
        cronManager.stop()
        cronManager.initialize()
        cronManager.start()
        return NextResponse.json({
          success: true,
          message: 'Cron jobs restarted successfully'
        })
        
      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}. Valid actions: init, start, stop, restart` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error controlling cron jobs:', error)
    
    if (error instanceof Error && error.message.includes('API')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to control cron jobs' },
      { status: 500 }
    )
  }
}