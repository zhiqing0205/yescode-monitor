import { NextResponse } from 'next/server'
import { initializeApplication } from '@/lib/startup'

// GET - 初始化应用程序
export async function GET() {
  try {
    console.log('Received application initialization request')
    
    // 初始化应用程序（包括启动定时任务）
    initializeApplication()
    
    return NextResponse.json({
      success: true,
      message: 'Application initialized successfully'
    })
  } catch (error) {
    console.error('Error initializing application:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - 也支持POST请求
export async function POST() {
  return GET()
}