'use client'

import { CalendarDays, DollarSign, Clock, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { differenceInDays } from 'date-fns'

interface DashboardCardsProps {
  data: any
}

export function DashboardCards({ data }: DashboardCardsProps) {
  if (!data?.latestRecord) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl glass hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-gray-200/50 dark:from-gray-800/50 dark:to-gray-900/50"></div>
            <div className="relative p-6 sm:p-8">
              <div className="animate-pulse space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded-lg w-24"></div>
                  <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded-lg w-32"></div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-300 dark:bg-gray-600 rounded-full w-1/3 loading-shimmer"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const { latestRecord, todayStats } = data
  
  const dailyUsed = parseFloat(latestRecord.dailySpentUsd || '0')
  const dailyBudget = parseFloat(latestRecord.dailyBudgetUsd || '25')
  const dailyPercentage = (dailyUsed / dailyBudget) * 100

  const monthlyUsed = parseFloat(latestRecord.monthlySpentUsd || '0')
  const monthlyBudget = parseFloat(latestRecord.monthlyBudgetUsd || '750')
  const monthlyPercentage = (monthlyUsed / monthlyBudget) * 100

  const planExpiresAt = new Date(latestRecord.planExpiresAt)
  const daysUntilExpiry = differenceInDays(planExpiresAt, new Date())

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 95) return { color: 'red', icon: AlertTriangle, label: '紧急' }
    if (percentage >= 80) return { color: 'orange', icon: AlertTriangle, label: '警告' }
    if (percentage >= 50) return { color: 'yellow', icon: TrendingUp, label: '注意' }
    return { color: 'green', icon: CheckCircle2, label: '正常' }
  }

  const dailyStatus = getUsageStatus(dailyPercentage)
  const monthlyStatus = getUsageStatus(monthlyPercentage)

  const getSubscriptionStatus = (days: number) => {
    if (days <= 3) return { color: 'red', label: '即将到期' }
    if (days <= 7) return { color: 'orange', label: '即将到期' }
    if (days <= 30) return { color: 'yellow', label: '剩余不多' }
    return { color: 'green', label: '充足' }
  }

  const subscriptionStatus = getSubscriptionStatus(daysUntilExpiry)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {/* 日使用量卡片 */}
      <div className="group relative overflow-hidden rounded-2xl glass hover-lift transition-all duration-500">
        {/* 渐变背景 */}
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${
          dailyStatus.color === 'red' ? 'from-red-400 to-red-600' :
          dailyStatus.color === 'orange' ? 'from-orange-400 to-orange-600' :
          dailyStatus.color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
          'from-green-400 to-green-600'
        }`}></div>
        
        {/* 装饰性光效 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
        
        <div className="relative p-6 sm:p-8">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-lg ${
                dailyStatus.color === 'red' ? 'bg-red-500 text-white' :
                dailyStatus.color === 'orange' ? 'bg-orange-500 text-white' :
                dailyStatus.color === 'yellow' ? 'bg-yellow-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">日使用量</h3>
                <div className="flex items-center gap-2 mt-1">
                  <dailyStatus.icon className={`w-3 h-3 ${
                    dailyStatus.color === 'red' ? 'text-red-500' :
                    dailyStatus.color === 'orange' ? 'text-orange-500' :
                    dailyStatus.color === 'yellow' ? 'text-yellow-500' :
                    'text-green-500'
                  }`} />
                  <span className={`text-xs font-medium ${
                    dailyStatus.color === 'red' ? 'text-red-500' :
                    dailyStatus.color === 'orange' ? 'text-orange-500' :
                    dailyStatus.color === 'yellow' ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {dailyStatus.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 金额显示 */}
          <div className="mb-6">
            <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              ${dailyUsed.toFixed(4)}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                预算 ${dailyBudget.toFixed(2)}
              </span>
              <span className={`font-bold ${
                dailyStatus.color === 'red' ? 'text-red-500' :
                dailyStatus.color === 'orange' ? 'text-orange-500' :
                dailyStatus.color === 'yellow' ? 'text-yellow-500' :
                'text-green-500'
              }`}>
                {dailyPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  dailyStatus.color === 'red' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                  dailyStatus.color === 'orange' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                  dailyStatus.color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  'bg-gradient-to-r from-green-400 to-green-600'
                } animate-pulse-glow`}
                style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              剩余 ${(dailyBudget - dailyUsed).toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* 月使用量卡片 */}
      <div className="group relative overflow-hidden rounded-2xl glass hover-lift transition-all duration-500">
        {/* 渐变背景 */}
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${
          monthlyStatus.color === 'red' ? 'from-red-400 to-red-600' :
          monthlyStatus.color === 'orange' ? 'from-orange-400 to-orange-600' :
          monthlyStatus.color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
          'from-purple-400 to-purple-600'
        }`}></div>
        
        {/* 装饰性光效 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
        
        <div className="relative p-6 sm:p-8">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-lg ${
                monthlyStatus.color === 'red' ? 'bg-red-500 text-white' :
                monthlyStatus.color === 'orange' ? 'bg-orange-500 text-white' :
                monthlyStatus.color === 'yellow' ? 'bg-yellow-500 text-white' :
                'bg-purple-500 text-white'
              }`}>
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">月使用量</h3>
                <div className="flex items-center gap-2 mt-1">
                  <monthlyStatus.icon className={`w-3 h-3 ${
                    monthlyStatus.color === 'red' ? 'text-red-500' :
                    monthlyStatus.color === 'orange' ? 'text-orange-500' :
                    monthlyStatus.color === 'yellow' ? 'text-yellow-500' :
                    'text-purple-500'
                  }`} />
                  <span className={`text-xs font-medium ${
                    monthlyStatus.color === 'red' ? 'text-red-500' :
                    monthlyStatus.color === 'orange' ? 'text-orange-500' :
                    monthlyStatus.color === 'yellow' ? 'text-yellow-500' :
                    'text-purple-500'
                  }`}>
                    {monthlyStatus.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 金额显示 */}
          <div className="mb-6">
            <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              ${monthlyUsed.toFixed(2)}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                预算 ${monthlyBudget.toFixed(2)}
              </span>
              <span className={`font-bold ${
                monthlyStatus.color === 'red' ? 'text-red-500' :
                monthlyStatus.color === 'orange' ? 'text-orange-500' :
                monthlyStatus.color === 'yellow' ? 'text-yellow-500' :
                'text-purple-500'
              }`}>
                {monthlyPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  monthlyStatus.color === 'red' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                  monthlyStatus.color === 'orange' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                  monthlyStatus.color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  'bg-gradient-to-r from-purple-400 to-purple-600'
                } animate-pulse-glow`}
                style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              剩余 ${(monthlyBudget - monthlyUsed).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* 订阅状态卡片 */}
      <div className="group relative overflow-hidden rounded-2xl glass hover-lift transition-all duration-500">
        {/* 渐变背景 */}
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${
          subscriptionStatus.color === 'red' ? 'from-red-400 to-red-600' :
          subscriptionStatus.color === 'orange' ? 'from-orange-400 to-orange-600' :
          subscriptionStatus.color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
          'from-blue-400 to-blue-600'
        }`}></div>
        
        {/* 装饰性光效 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
        
        <div className="relative p-6 sm:p-8">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-lg ${
                subscriptionStatus.color === 'red' ? 'bg-red-500 text-white' :
                subscriptionStatus.color === 'orange' ? 'bg-orange-500 text-white' :
                subscriptionStatus.color === 'yellow' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">订阅状态</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    subscriptionStatus.color === 'red' ? 'bg-red-500' :
                    subscriptionStatus.color === 'orange' ? 'bg-orange-500' :
                    subscriptionStatus.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  } animate-pulse`}></div>
                  <span className={`text-xs font-medium ${
                    subscriptionStatus.color === 'red' ? 'text-red-500' :
                    subscriptionStatus.color === 'orange' ? 'text-orange-500' :
                    subscriptionStatus.color === 'yellow' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`}>
                    {subscriptionStatus.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 天数显示 */}
          <div className="mb-6">
            <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {daysUntilExpiry} <span className="text-lg font-medium text-gray-500 dark:text-gray-400">天</span>
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                距离到期
              </span>
              <span className={`font-bold capitalize ${
                latestRecord.planType === 'basic' ? 'text-blue-500' :
                latestRecord.planType === 'pro' ? 'text-purple-500' :
                'text-green-500'
              }`}>
                {latestRecord.planType}
              </span>
            </div>
          </div>

          {/* 到期时间 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              到期时间
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">
              {planExpiresAt.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}