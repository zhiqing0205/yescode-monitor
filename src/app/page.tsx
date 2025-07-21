'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun, Activity, TrendingUp } from 'lucide-react'
import { FaGithub } from 'react-icons/fa'
import { useTheme } from 'next-themes'
import { DashboardCards } from '@/components/DashboardCards'
import { UsageChart } from '@/components/UsageChart'

interface DashboardData {
  todayRecords: any[]
  monthlyStats: any[]
  todayStats: any
  latestRecord: any
  tokenInfo: {
    isValid: boolean
    daysRemaining: number
    expirationDate: string | null
    expirationTime: string | null
    error: string | null
  }
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    setMounted(true)
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  // 倒计时效果
  useEffect(() => {
    if (!data?.todayRecords?.length) return

    // 计算下次更新时间
    const calculateNextUpdateTime = () => {
      const latestRecord = data.todayRecords[data.todayRecords.length - 1]
      if (!latestRecord?.timestamp) return 300 // 默认5分钟

      const lastUpdateTime = new Date(latestRecord.timestamp).getTime()
      const nextUpdateTime = lastUpdateTime + (5 * 60 * 1000) // 5分钟后
      const now = Date.now()
      
      return Math.max(0, Math.floor((nextUpdateTime - now) / 1000))
    }

    setCountdown(calculateNextUpdateTime())

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 倒计时结束，重新计算
          return calculateNextUpdateTime()
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [data?.todayRecords?.length]) // 只依赖数据长度，避免频繁重新计算

  // 格式化倒计时显示
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs.toString().padStart(2, '0')}秒`
  }

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 动态渐变背景层 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/50 to-purple-50/50 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-indigo-900/30 animate-gradient"></div>
      
      {/* 装饰性渐变球 */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 dark:from-blue-500/20 dark:to-purple-500/20 rounded-full blur-3xl animate-float"></div>
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 dark:from-purple-400/20 dark:to-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-br from-indigo-400/20 to-blue-600/20 dark:from-indigo-400/20 dark:to-blue-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      
      {/* 玻璃遮罩层 */}
      <div className="absolute inset-0 bg-white/20 dark:bg-gray-950/20 backdrop-blur-sm"></div>
      
      {/* 主要内容 */}
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* 头部区域 */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 sm:gap-0">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-primary text-white shadow-lg animate-pulse-glow">
                <Activity className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white transition-colors">
                  PackyCode Monitor
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base mt-1 font-medium transition-colors">
                  实时使用量监控与分析平台
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 主题切换按钮 */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="group relative p-3 rounded-xl glass hover-lift transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-yellow-500 transition-transform duration-300 group-hover:rotate-180" />
                  ) : (
                    <Moon className="w-5 h-5 text-indigo-600 transition-transform duration-300 group-hover:-rotate-12" />
                  )}
                </div>
              </button>
              
              {/* GitHub链接 */}
              <a
                href={process.env.NEXT_PUBLIC_GITHUB_URL || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-3 rounded-xl glass hover-lift transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gray-500/20 to-gray-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <FaGithub className="w-5 h-5 text-gray-700 dark:text-gray-300 transition-transform duration-300 group-hover:scale-110" />
                </div>
              </a>
              
              {/* 状态指示器 */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass">
                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-pulse'}`}></div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {loading ? '同步中' : '在线'}
                </span>
              </div>
            </div>
          </header>

          {/* 加载状态 */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-blue-400"></div>
              </div>
              <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium animate-pulse">
                正在加载监控数据...
              </p>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {/* 仪表板卡片 */}
              <div className="animate-breath">
                <DashboardCards data={data} />
              </div>

              {/* 使用量图表 */}
              <div className="animate-breath" style={{ animationDelay: '1s' }}>
                <UsageChart data={data?.todayRecords || []} monthlyData={data?.monthlyStats || []} />
              </div>
            </div>
          )}

          {/* 底部信息 */}
          <footer className="mt-8 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>
                数据每 5 分钟自动更新
                {countdown > 0 && (
                  <span className="ml-1 text-gray-500 dark:text-gray-500 font-mono">
                    • {formatCountdown(countdown)}后更新
                  </span>
                )}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
              基于 Next.js 构建 • 由 Vercel 托管
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}