'use client'

import { CalendarDays, DollarSign, Clock, TrendingUp, AlertTriangle, CheckCircle2, Shield, ShieldAlert, ShieldCheck, CreditCard } from 'lucide-react'
import { differenceInDays } from 'date-fns'

interface DashboardCardsProps {
  data: any
  monthlyStats?: any[]
}

export function DashboardCards({ data, monthlyStats = [] }: DashboardCardsProps) {
  if (!data?.latestRecord) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl glass hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-gray-200/50 dark:from-gray-800/50 dark:to-gray-900/50"></div>
            <div className="relative p-3 sm:p-5">
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
  
  // YesCode数据结构适配
  // 注意：数据库中的balance字段存储的是subscription_balance的值
  const currentBalance = parseFloat(latestRecord.balance || '0')
  const payAsYouGoBalance = parseFloat(latestRecord.payAsYouGoBalance || '0')
  const payAsYouGoTotal = 50 // 固定总量50
  const dailyQuota = parseFloat(latestRecord.dailyBalance || '20')
  const dailyUsed = Math.max(0, dailyQuota - currentBalance)
  const dailyPercentage = (dailyUsed / dailyQuota) * 100
  const payAsYouGoUsed = Math.max(0, payAsYouGoTotal - payAsYouGoBalance)
  const payAsYouGoPercentage = (payAsYouGoUsed / payAsYouGoTotal) * 100

  const monthlySpend = parseFloat(latestRecord.currentMonthSpend || '0')
  
  // 如果API返回的月消费为0，则从数据库统计单日消耗总和
  const actualMonthlySpend = monthlySpend > 0 ? monthlySpend : 
    monthlyStats.reduce((sum, stat) => sum + parseFloat(stat.currentSpend || '0'), 0)
  
  const monthlyLimit = parseFloat(latestRecord.monthlySpendLimit || '600')
  const monthlyPercentage = (actualMonthlySpend / monthlyLimit) * 100

  const planExpiresAt = new Date(latestRecord.subscriptionExpiry)
  const now = new Date()
  const timeDiff = planExpiresAt.getTime() - now.getTime()
  const hoursUntilExpiry = Math.floor(timeDiff / (1000 * 60 * 60))
  const daysUntilExpiry = differenceInDays(planExpiresAt, now)
  
  // 格式化剩余时间显示
  const formatTimeRemaining = (hours: number, days: number) => {
    if (hours < 0) {
      return { value: '已过期', unit: '', isExpired: true }
    } else if (hours < 24) {
      return { value: hours.toString(), unit: '小时', isExpired: false }
    } else {
      return { value: days.toString(), unit: '天', isExpired: false }
    }
  }
  
  const subscriptionTimeRemaining = formatTimeRemaining(hoursUntilExpiry, daysUntilExpiry)

  // 统一颜色管理系统 - 6级颜色方案
  const getUnifiedStatus = (percentage: number) => {
    if (percentage >= 95) return { color: 'red', icon: AlertTriangle, label: '紧急' }
    if (percentage >= 80) return { color: 'orange', icon: AlertTriangle, label: '警告' }
    if (percentage >= 60) return { color: 'yellow', icon: TrendingUp, label: '注意' }
    if (percentage >= 40) return { color: 'blue', icon: TrendingUp, label: '关注' }
    if (percentage >= 20) return { color: 'purple', icon: CheckCircle2, label: '良好' }
    return { color: 'green', icon: CheckCircle2, label: '正常' }
  }

  const dailyStatus = getUnifiedStatus(dailyPercentage)
  const monthlyStatus = getUnifiedStatus(monthlyPercentage)
  const payAsYouGoStatus = getUnifiedStatus(payAsYouGoPercentage)

  // 订阅状态管理函数，使用统一颜色方案
  const getSubscriptionStatus = (percentage: number) => {
    if (percentage >= 95) return { color: 'red', label: '服务过期', icon: ShieldAlert }
    if (percentage >= 80) return { color: 'orange', label: '紧急续费', icon: ShieldAlert }
    if (percentage >= 60) return { color: 'yellow', label: '即将到期', icon: ShieldAlert }
    if (percentage >= 40) return { color: 'blue', label: '续费提醒', icon: Shield }
    if (percentage >= 20) return { color: 'purple', label: '运行正常', icon: Shield }
    return { color: 'green', label: '服务稳定', icon: ShieldCheck }
  }

  // 计算订阅状态百分比 - 统一使用小时级别进度条
  const subscriptionTotalDays = 30
  let subscriptionPercentage = 0
  
  if (subscriptionTimeRemaining.isExpired) {
    subscriptionPercentage = 100 // 已过期
  } else {
    // 统一基于小时计算进度条，提供更精确的可视化
    const totalHours = subscriptionTotalDays * 24
    const usedHours = totalHours - hoursUntilExpiry
    subscriptionPercentage = Math.min(100, Math.max(0, (usedHours / totalHours) * 100))
  }
  
  const subscriptionStatus = getSubscriptionStatus(subscriptionPercentage)

  // 进度条百分比（直接使用计算好的百分比）
  const subscriptionProgress = subscriptionPercentage

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
      {/* 日使用量卡片 */}
      <div className="group relative overflow-hidden rounded-2xl glass hover-lift transition-all duration-500">
        {/* 渐变背景 */}
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${
          dailyStatus.color === 'red' ? 'from-red-400 to-red-600' :
          dailyStatus.color === 'orange' ? 'from-orange-400 to-orange-600' :
          dailyStatus.color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
          dailyStatus.color === 'blue' ? 'from-blue-400 to-blue-600' :
          dailyStatus.color === 'purple' ? 'from-purple-400 to-purple-600' :
          'from-green-400 to-green-600'
        }`}></div>
        
        {/* 装饰性光效 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
        
        <div className="relative p-3 sm:p-4">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg shadow-lg ${
                dailyStatus.color === 'red' ? 'bg-red-500 text-white' :
                dailyStatus.color === 'orange' ? 'bg-orange-500 text-white' :
                dailyStatus.color === 'yellow' ? 'bg-yellow-500 text-white' :
                dailyStatus.color === 'blue' ? 'bg-blue-500 text-white' :
                dailyStatus.color === 'purple' ? 'bg-purple-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">订阅余额日消耗</h3>
                <div className="flex items-center gap-2 mt-1">
                  <dailyStatus.icon className={`w-4 h-4 ${
                    dailyStatus.color === 'red' ? 'text-red-500' :
                    dailyStatus.color === 'orange' ? 'text-orange-500' :
                    dailyStatus.color === 'yellow' ? 'text-yellow-500' :
                    dailyStatus.color === 'blue' ? 'text-blue-500' :
                    dailyStatus.color === 'purple' ? 'text-purple-500' :
                    'text-green-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    dailyStatus.color === 'red' ? 'text-red-500' :
                    dailyStatus.color === 'orange' ? 'text-orange-500' :
                    dailyStatus.color === 'yellow' ? 'text-yellow-500' :
                    dailyStatus.color === 'blue' ? 'text-blue-500' :
                    dailyStatus.color === 'purple' ? 'text-purple-500' :
                    'text-green-500'
                  }`}>
                    {dailyStatus.label}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 数字部分 - 移到右边并增加上边距 */}
            <div className="text-right mt-3">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                ${dailyUsed.toFixed(2)}
              </p>
              <div className="flex items-center justify-end gap-2 text-base">
                <span className={`font-bold ${
                  dailyStatus.color === 'red' ? 'text-red-500' :
                  dailyStatus.color === 'orange' ? 'text-orange-500' :
                  dailyStatus.color === 'yellow' ? 'text-yellow-500' :
                  dailyStatus.color === 'blue' ? 'text-blue-500' :
                  dailyStatus.color === 'purple' ? 'text-purple-500' :
                  'text-green-500'
                }`}>
                  {dailyPercentage.toFixed(1)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  /${dailyQuota.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 进度条和剩余 */}
          <div className="space-y-2">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  dailyStatus.color === 'red' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                  dailyStatus.color === 'orange' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                  dailyStatus.color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  dailyStatus.color === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                  dailyStatus.color === 'purple' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                  'bg-gradient-to-r from-green-400 to-green-600'
                } animate-pulse-glow`}
                style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                剩余 ${(dailyQuota - dailyUsed).toFixed(2)}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                配额 ${dailyQuota.toFixed(2)}
              </p>
            </div>
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
          monthlyStatus.color === 'blue' ? 'from-blue-400 to-blue-600' :
          monthlyStatus.color === 'purple' ? 'from-purple-400 to-purple-600' :
          'from-green-400 to-green-600'
        }`}></div>
        
        {/* 装饰性光效 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
        
        <div className="relative p-3 sm:p-4">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg shadow-lg ${
                monthlyStatus.color === 'red' ? 'bg-red-500 text-white' :
                monthlyStatus.color === 'orange' ? 'bg-orange-500 text-white' :
                monthlyStatus.color === 'yellow' ? 'bg-yellow-500 text-white' :
                monthlyStatus.color === 'blue' ? 'bg-blue-500 text-white' :
                monthlyStatus.color === 'purple' ? 'bg-purple-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">月消耗量</h3>
                <div className="flex items-center gap-2 mt-1">
                  <monthlyStatus.icon className={`w-4 h-4 ${
                    monthlyStatus.color === 'red' ? 'text-red-500' :
                    monthlyStatus.color === 'orange' ? 'text-orange-500' :
                    monthlyStatus.color === 'yellow' ? 'text-yellow-500' :
                    monthlyStatus.color === 'blue' ? 'text-blue-500' :
                    monthlyStatus.color === 'purple' ? 'text-purple-500' :
                    'text-green-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    monthlyStatus.color === 'red' ? 'text-red-500' :
                    monthlyStatus.color === 'orange' ? 'text-orange-500' :
                    monthlyStatus.color === 'yellow' ? 'text-yellow-500' :
                    monthlyStatus.color === 'blue' ? 'text-blue-500' :
                    monthlyStatus.color === 'purple' ? 'text-purple-500' :
                    'text-green-500'
                  }`}>
                    {monthlyStatus.label}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 数字部分 - 移到右边并增加上边距 */}
            <div className="text-right mt-3">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                ${actualMonthlySpend.toFixed(2)}
              </p>
              <div className="flex items-center justify-end gap-2 text-base">
                <span className={`font-bold ${
                  monthlyStatus.color === 'red' ? 'text-red-500' :
                  monthlyStatus.color === 'orange' ? 'text-orange-500' :
                  monthlyStatus.color === 'yellow' ? 'text-yellow-500' :
                  monthlyStatus.color === 'blue' ? 'text-blue-500' :
                  monthlyStatus.color === 'purple' ? 'text-purple-500' :
                  'text-green-500'
                }`}>
                  {monthlyPercentage.toFixed(1)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  /${monthlyLimit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 进度条和剩余 */}
          <div className="space-y-2">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  monthlyStatus.color === 'red' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                  monthlyStatus.color === 'orange' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                  monthlyStatus.color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  monthlyStatus.color === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                  monthlyStatus.color === 'purple' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                  'bg-gradient-to-r from-green-400 to-green-600'
                } animate-pulse-glow`}
                style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                剩余 ${(monthlyLimit - actualMonthlySpend).toFixed(2)}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                限额 ${monthlyLimit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 按量付费余额卡片 */}
      <div className="group relative overflow-hidden rounded-2xl glass hover-lift transition-all duration-500">
        {/* 渐变背景 */}
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${
          payAsYouGoStatus.color === 'red' ? 'from-red-400 to-red-600' :
          payAsYouGoStatus.color === 'orange' ? 'from-orange-400 to-orange-600' :
          payAsYouGoStatus.color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
          payAsYouGoStatus.color === 'blue' ? 'from-blue-400 to-blue-600' :
          payAsYouGoStatus.color === 'purple' ? 'from-purple-400 to-purple-600' :
          'from-green-400 to-green-600'
        }`}></div>
        
        {/* 装饰性光效 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
        
        <div className="relative p-3 sm:p-4">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg shadow-lg ${
                payAsYouGoStatus.color === 'red' ? 'bg-red-500 text-white' :
                payAsYouGoStatus.color === 'orange' ? 'bg-orange-500 text-white' :
                payAsYouGoStatus.color === 'yellow' ? 'bg-yellow-500 text-white' :
                payAsYouGoStatus.color === 'blue' ? 'bg-blue-500 text-white' :
                payAsYouGoStatus.color === 'purple' ? 'bg-purple-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">按量付费余额</h3>
                <div className="flex items-center gap-2 mt-1">
                  <payAsYouGoStatus.icon className={`w-4 h-4 ${
                    payAsYouGoStatus.color === 'red' ? 'text-red-500' :
                    payAsYouGoStatus.color === 'orange' ? 'text-orange-500' :
                    payAsYouGoStatus.color === 'yellow' ? 'text-yellow-500' :
                    payAsYouGoStatus.color === 'blue' ? 'text-blue-500' :
                    payAsYouGoStatus.color === 'purple' ? 'text-purple-500' :
                    'text-green-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    payAsYouGoStatus.color === 'red' ? 'text-red-500' :
                    payAsYouGoStatus.color === 'orange' ? 'text-orange-500' :
                    payAsYouGoStatus.color === 'yellow' ? 'text-yellow-500' :
                    payAsYouGoStatus.color === 'blue' ? 'text-blue-500' :
                    payAsYouGoStatus.color === 'purple' ? 'text-purple-500' :
                    'text-green-500'
                  }`}>
                    {payAsYouGoStatus.label}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 数字部分 */}
            <div className="text-right mt-3">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                ${payAsYouGoBalance.toFixed(2)}
              </p>
              <div className="flex items-center justify-end gap-2 text-base">
                <span className={`font-bold ${
                  payAsYouGoStatus.color === 'red' ? 'text-red-500' :
                  payAsYouGoStatus.color === 'orange' ? 'text-orange-500' :
                  payAsYouGoStatus.color === 'yellow' ? 'text-yellow-500' :
                  payAsYouGoStatus.color === 'blue' ? 'text-blue-500' :
                  payAsYouGoStatus.color === 'purple' ? 'text-purple-500' :
                  'text-green-500'
                }`}>
                  {payAsYouGoPercentage.toFixed(1)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  /${payAsYouGoTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 进度条和剩余 */}
          <div className="space-y-2">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  payAsYouGoStatus.color === 'red' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                  payAsYouGoStatus.color === 'orange' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                  payAsYouGoStatus.color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  payAsYouGoStatus.color === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                  payAsYouGoStatus.color === 'purple' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                  'bg-gradient-to-r from-green-400 to-green-600'
                } animate-pulse-glow`}
                style={{ width: `${Math.min(payAsYouGoPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                剩余 ${payAsYouGoBalance.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                总额 ${payAsYouGoTotal.toFixed(2)}
              </p>
            </div>
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
          subscriptionStatus.color === 'blue' ? 'from-blue-400 to-blue-600' :
          subscriptionStatus.color === 'purple' ? 'from-purple-400 to-purple-600' :
          'from-green-400 to-green-600'
        }`}></div>
        
        {/* 装饰性光效 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
        
        <div className="relative p-3 sm:p-4">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg shadow-lg ${
                subscriptionStatus.color === 'red' ? 'bg-red-500 text-white' :
                subscriptionStatus.color === 'orange' ? 'bg-orange-500 text-white' :
                subscriptionStatus.color === 'yellow' ? 'bg-yellow-500 text-white' :
                subscriptionStatus.color === 'blue' ? 'bg-blue-500 text-white' :
                subscriptionStatus.color === 'purple' ? 'bg-purple-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">订阅状态</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${
                    subscriptionStatus.color === 'red' ? 'bg-red-500' :
                    subscriptionStatus.color === 'orange' ? 'bg-orange-500' :
                    subscriptionStatus.color === 'yellow' ? 'bg-yellow-500' :
                    subscriptionStatus.color === 'blue' ? 'bg-blue-500' :
                    subscriptionStatus.color === 'purple' ? 'bg-purple-500' :
                    'bg-green-500'
                  } animate-pulse`}></div>
                  <span className={`text-sm font-medium ${
                    subscriptionStatus.color === 'red' ? 'text-red-500' :
                    subscriptionStatus.color === 'orange' ? 'text-orange-500' :
                    subscriptionStatus.color === 'yellow' ? 'text-yellow-500' :
                    subscriptionStatus.color === 'blue' ? 'text-blue-500' :
                    subscriptionStatus.color === 'purple' ? 'text-purple-500' :
                    'text-green-500'
                  }`}>
                    {subscriptionStatus.label}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 数字部分 - 移到右边并增加上边距 */}
            <div className="text-right mt-3">
              <p className={`text-3xl sm:text-4xl font-bold mb-2 ${
                subscriptionTimeRemaining.isExpired 
                  ? 'text-red-500 dark:text-red-400' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {subscriptionTimeRemaining.value} 
                {!subscriptionTimeRemaining.isExpired && (
                  <span className="text-xl font-medium text-gray-500 dark:text-gray-400">
                    {subscriptionTimeRemaining.unit}
                  </span>
                )}
              </p>
              <div className="flex items-center justify-end gap-2 text-base">
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {latestRecord.planName || 'Unknown'}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  距离到期
                </span>
              </div>
            </div>
          </div>

          {/* 进度条和剩余 */}
          <div className="space-y-2">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  subscriptionStatus.color === 'red' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                  subscriptionStatus.color === 'orange' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                  subscriptionStatus.color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  subscriptionStatus.color === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                  subscriptionStatus.color === 'purple' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                  'bg-gradient-to-r from-green-400 to-green-600'
                } animate-pulse-glow`}
                style={{ width: `${Math.min(subscriptionProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                到期时间
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">
                {planExpiresAt.toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })} {planExpiresAt.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}