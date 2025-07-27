'use client'

import { CalendarDays, DollarSign, Clock, TrendingUp, AlertTriangle, CheckCircle2, Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { differenceInDays } from 'date-fns'

interface DashboardCardsProps {
  data: any
  monthlyStats?: any[]
}

export function DashboardCards({ data, monthlyStats = [] }: DashboardCardsProps) {
  if (!data?.latestRecord) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
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
  const currentBalance = parseFloat(latestRecord.balance || '0')
  const dailyQuota = parseFloat(latestRecord.dailyBalance || '20')
  const dailyUsed = Math.max(0, dailyQuota - currentBalance)
  const dailyPercentage = (dailyUsed / dailyQuota) * 100

  const monthlySpend = parseFloat(latestRecord.currentMonthSpend || '0')
  
  // 如果API返回的月消费为0，则从数据库统计单日消耗总和
  const actualMonthlySpend = monthlySpend > 0 ? monthlySpend : 
    monthlyStats.reduce((sum, stat) => sum + parseFloat(stat.currentSpend || '0'), 0)
  
  const monthlyLimit = parseFloat(latestRecord.monthlySpendLimit || '600')
  const monthlyPercentage = (actualMonthlySpend / monthlyLimit) * 100

  const planExpiresAt = new Date(latestRecord.subscriptionExpiry)
  const daysUntilExpiry = differenceInDays(planExpiresAt, new Date())

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 95) return { color: 'red', icon: AlertTriangle, label: '紧急' }
    if (percentage >= 80) return { color: 'orange', icon: AlertTriangle, label: '警告' }
    if (percentage >= 50) return { color: 'yellow', icon: TrendingUp, label: '注意' }
    return { color: 'green', icon: CheckCircle2, label: '正常' }
  }

  const dailyStatus = getUsageStatus(dailyPercentage)
  const monthlyStatus = getUsageStatus(monthlyPercentage)

  // 统一的状态管理函数，基于百分比
  const getUnifiedStatus = (percentage: number, type: 'subscription' | 'cookie') => {
    // 状态映射表
    const statusMap = {
      subscription: {
        100: { color: 'red', label: '服务过期', icon: ShieldAlert },
        80: { color: 'red', label: '紧急续费', icon: ShieldAlert },
        60: { color: 'orange', label: '即将到期', icon: ShieldAlert },
        40: { color: 'yellow', label: '续费提醒', icon: Shield },
        20: { color: 'blue', label: '运行正常', icon: Shield },
        0: { color: 'green', label: '服务稳定', icon: ShieldCheck }
      },
      cookie: {
        100: { color: 'red', label: '认证过期', icon: ShieldAlert },
        80: { color: 'red', label: '紧急更新', icon: ShieldAlert },
        60: { color: 'orange', label: '即将到期', icon: ShieldAlert },
        40: { color: 'yellow', label: '更新提醒', icon: Shield },
        20: { color: 'blue', label: '状态良好', icon: Shield },
        0: { color: 'green', label: '认证有效', icon: ShieldCheck }
      }
    }

    const thresholds = [100, 80, 60, 40, 20, 0]
    const map = statusMap[type]
    
    for (const threshold of thresholds) {
      if (percentage >= threshold) {
        return map[threshold as keyof typeof map]
      }
    }
    
    return map[0] // 默认返回最低级状态
  }

  // 计算订阅状态百分比 (已用时间 / 总时间 * 100)
  const subscriptionTotalDays = 30
  const subscriptionUsedDays = Math.max(0, subscriptionTotalDays - daysUntilExpiry)
  const subscriptionPercentage = Math.min(100, Math.max(0, (subscriptionUsedDays / subscriptionTotalDays) * 100))
  
  // 获取Token信息
  const tokenInfo = data?.tokenInfo
  
  // 计算Cookie状态百分比
  const cookieTotalDays = 7
  const cookieUsedDays = tokenInfo && tokenInfo.isValid 
    ? Math.max(0, cookieTotalDays - tokenInfo.daysRemaining)
    : cookieTotalDays // 如果无效则视为100%
  const cookiePercentage = Math.min(100, Math.max(0, (cookieUsedDays / cookieTotalDays) * 100))

  const subscriptionStatus = getUnifiedStatus(subscriptionPercentage, 'subscription')
  const cookieStatus = tokenInfo 
    ? getUnifiedStatus(cookiePercentage, 'cookie') 
    : { color: 'gray', icon: Shield, label: '未知' }

  // 进度条百分比（直接使用计算好的百分比）
  const subscriptionProgress = subscriptionPercentage
  const cookieProgress = cookiePercentage

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
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
        
        <div className="relative p-3 sm:p-4">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg shadow-lg ${
                dailyStatus.color === 'red' ? 'bg-red-500 text-white' :
                dailyStatus.color === 'orange' ? 'bg-orange-500 text-white' :
                dailyStatus.color === 'yellow' ? 'bg-yellow-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">日消耗量</h3>
                <div className="flex items-center gap-2 mt-1">
                  <dailyStatus.icon className={`w-4 h-4 ${
                    dailyStatus.color === 'red' ? 'text-red-500' :
                    dailyStatus.color === 'orange' ? 'text-orange-500' :
                    dailyStatus.color === 'yellow' ? 'text-yellow-500' :
                    'text-green-500'
                  }`} />
                  <span className={`text-sm font-medium ${
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
          'from-purple-400 to-purple-600'
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
                'bg-purple-500 text-white'
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
                    'text-purple-500'
                  }`} />
                  <span className={`text-sm font-medium ${
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
                  'text-purple-500'
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
                  'bg-gradient-to-r from-purple-400 to-purple-600'
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

      {/* 订阅状态卡片 */}
      <div className="group relative overflow-hidden rounded-2xl glass hover-lift transition-all duration-500">
        {/* 渐变背景 */}
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${
          subscriptionStatus.color === 'red' ? 'from-red-400 to-red-600' :
          subscriptionStatus.color === 'orange' ? 'from-orange-400 to-orange-600' :
          subscriptionStatus.color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
          subscriptionStatus.color === 'blue' ? 'from-blue-400 to-blue-600' :
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
                    'bg-green-500'
                  } animate-pulse`}></div>
                  <span className={`text-sm font-medium ${
                    subscriptionStatus.color === 'red' ? 'text-red-500' :
                    subscriptionStatus.color === 'orange' ? 'text-orange-500' :
                    subscriptionStatus.color === 'yellow' ? 'text-yellow-500' :
                    subscriptionStatus.color === 'blue' ? 'text-blue-500' :
                    'text-green-500'
                  }`}>
                    {subscriptionStatus.label}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 数字部分 - 移到右边并增加上边距 */}
            <div className="text-right mt-3">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {daysUntilExpiry} <span className="text-xl font-medium text-gray-500 dark:text-gray-400">天</span>
              </p>
              <div className="flex items-center justify-end gap-2 text-base">
                <span className={`font-bold capitalize ${
                  latestRecord.subscriptionPlanId === 1 ? 'text-blue-500' :
                  latestRecord.subscriptionPlanId === 2 ? 'text-purple-500' :
                  'text-green-500'
                }`}>
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

      {/* Cookie状态卡片 */}
      <div className="group relative overflow-hidden rounded-2xl glass hover-lift transition-all duration-500">
        {/* 渐变背景 */}
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${
          cookieStatus.color === 'red' ? 'from-red-400 to-red-600' :
          cookieStatus.color === 'orange' ? 'from-orange-400 to-orange-600' :
          cookieStatus.color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
          cookieStatus.color === 'blue' ? 'from-blue-400 to-blue-600' :
          cookieStatus.color === 'green' ? 'from-emerald-400 to-emerald-600' :
          'from-gray-400 to-gray-600'
        }`}></div>
        
        {/* 装饰性光效 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
        
        <div className="relative p-3 sm:p-4">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg shadow-lg ${
                cookieStatus.color === 'red' ? 'bg-red-500 text-white' :
                cookieStatus.color === 'orange' ? 'bg-orange-500 text-white' :
                cookieStatus.color === 'yellow' ? 'bg-yellow-500 text-white' :
                cookieStatus.color === 'blue' ? 'bg-blue-500 text-white' :
                cookieStatus.color === 'green' ? 'bg-emerald-500 text-white' :
                'bg-gray-500 text-white'
              }`}>
                <cookieStatus.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">Cookie状态</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${
                    cookieStatus.color === 'red' ? 'bg-red-500' :
                    cookieStatus.color === 'orange' ? 'bg-orange-500' :
                    cookieStatus.color === 'yellow' ? 'bg-yellow-500' :
                    cookieStatus.color === 'blue' ? 'bg-blue-500' :
                    cookieStatus.color === 'green' ? 'bg-emerald-500' :
                    'bg-gray-500'
                  } animate-pulse`}></div>
                  <span className={`text-sm font-medium ${
                    cookieStatus.color === 'red' ? 'text-red-500' :
                    cookieStatus.color === 'orange' ? 'text-orange-500' :
                    cookieStatus.color === 'yellow' ? 'text-yellow-500' :
                    cookieStatus.color === 'blue' ? 'text-blue-500' :
                    cookieStatus.color === 'green' ? 'text-emerald-500' :
                    'text-gray-500'
                  }`}>
                    {cookieStatus.label}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 数字部分 - 移到右边并增加上边距 */}
            <div className="text-right mt-3">
              {tokenInfo && !tokenInfo.error ? (
                <>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {tokenInfo.daysRemaining} <span className="text-xl font-medium text-gray-500 dark:text-gray-400">天</span>
                  </p>
                  <div className="flex items-center justify-end gap-2 text-base">
                    <span className={`font-bold ${
                      tokenInfo.isValid ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {tokenInfo.isValid ? '有效' : '已过期'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      有效期限
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-500 dark:text-gray-400 mb-2">
                    N/A
                  </p>
                  <div className="flex items-center justify-end gap-2 text-sm">
                    <span className="text-red-500">
                      {tokenInfo?.error || 'Cookie错误'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 进度条和Cookie到期时间 */}
          <div className="space-y-2">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  cookieStatus.color === 'red' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                  cookieStatus.color === 'orange' ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                  cookieStatus.color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                  cookieStatus.color === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                  cookieStatus.color === 'green' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                  'bg-gradient-to-r from-gray-400 to-gray-600'
                } animate-pulse-glow`}
                style={{ width: `${Math.min(cookieProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                到期时间
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">
                {tokenInfo && tokenInfo.expirationDate && tokenInfo.expirationTime ? 
                  `${tokenInfo.expirationDate.replace(/-/g, '/')} ${tokenInfo.expirationTime.substring(0, 5)}` : 
                  '无法获取'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}