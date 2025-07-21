'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, startOfDay, addHours, subDays } from 'date-fns'
import { BarChart3, TrendingDown, TrendingUp, Calendar, Clock } from 'lucide-react'
import { useTheme } from 'next-themes'

interface UsageChartProps {
  data: any[]
  monthlyData?: any[] // 新增30天数据
}

export function UsageChart({ data, monthlyData = [] }: UsageChartProps) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<'today' | '30days'>('today')
  
  // 直接使用本地时间，因为环境已经是东八区
  const today = startOfDay(new Date())
  
  // 生成24小时的时间轴作为背景
  const fullTimeAxis = Array.from({ length: 24 }, (_, hour) => {
    const hourTime = addHours(today, hour)
    return {
      hour: format(hourTime, 'HH:mm'),
      hourNumber: hour,
      balance: null,
      timestamp: hourTime.getTime(),
      hasData: false
    }
  })
  
  // 处理实际数据点
  const actualDataPoints = data
    .filter(record => {
      const recordTime = new Date(record.timestamp)
      const recordDay = startOfDay(recordTime)
      return recordDay.getTime() === today.getTime()
    })
    .map(record => {
      const recordTime = new Date(record.timestamp)
      const currentBalance = parseFloat(record.dailyBudgetUsd) - parseFloat(record.dailySpentUsd)
      
      return {
        hour: format(recordTime, 'HH:mm'),
        hourNumber: recordTime.getHours() + recordTime.getMinutes() / 60, // 精确到分钟
        balance: parseFloat(currentBalance.toFixed(2)),
        timestamp: recordTime.getTime(),
        hasData: true,
        dailyBudget: parseFloat(record.dailyBudgetUsd)
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)

  // 获取预算值用于Y轴范围
  const dailyBudget = actualDataPoints.length > 0 ? actualDataPoints[0].dailyBudget : 25

  // 只使用实际数据点来绘制图表
  const chartData = actualDataPoints

  // 处理30天数据
  const process30DaysData = () => {
    // 生成完整的30天数据，包括缺失的日期
    return Array.from({ length: 30 }, (_, index) => {
      const date = subDays(new Date(), 29 - index)
      const dateStr = format(date, 'yyyy-MM-dd')
      
      // 从DailyStats中查找对应日期的数据
      const dayStats = monthlyData.find((stats: any) => {
        const statsDate = format(new Date(stats.date), 'yyyy-MM-dd')
        return statsDate === dateStr
      })
      
      return {
        date: dateStr,
        dateDisplay: format(date, 'MM/dd'),
        usage: dayStats ? parseFloat(dayStats.totalUsed || '0') : 0,
        budget: 25, // 默认预算，可以根据需要调整
        usagePercentage: dayStats ? parseFloat(dayStats.usagePercentage || '0') : 0,
        dayIndex: index
      }
    })
  }

  const monthlyChartData = process30DaysData()

  // 计算趋势
  const validBalances = chartData.filter(d => d.balance !== null).map(d => d.balance as number)
  const trend = validBalances.length > 1 
    ? validBalances[validBalances.length - 1] - validBalances[0]
    : 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      
      // 格式化时间显示，从timestamp转换为东八区时间
      let timeDisplay = ''
      let dateDisplay = ''
      if (dataPoint.timestamp) {
        const date = new Date(dataPoint.timestamp)
        timeDisplay = format(date, 'HH:mm')
        dateDisplay = format(date, 'yyyy-MM-dd')
      } else {
        // 如果没有timestamp，使用hourNumber转换
        const hours = Math.floor(label)
        const minutes = Math.round((label - hours) * 60)
        timeDisplay = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        dateDisplay = format(new Date(), 'yyyy-MM-dd')
      }
      
      return (
        <div className="glass rounded-xl p-4 shadow-2xl border border-white/20 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">
            {`${dateDisplay} ${timeDisplay}`}
          </p>
          {dataPoint.hasData ? (
            <div className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: payload[0].color }}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  当前余额
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                ${payload[0].value?.toFixed(2) || '0.00'}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
          )}
        </div>
      )
    }
    return null
  }

  const MonthlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      
      return (
        <div className="glass rounded-xl p-4 shadow-2xl border border-white/20 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">
            {dataPoint.date}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  日使用量
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                ${dataPoint.usage?.toFixed(4) || '0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                使用率
              </span>
              <span className={`text-xs font-bold ${
                dataPoint.usagePercentage > 80 ? 'text-red-500' : 
                dataPoint.usagePercentage > 50 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {dataPoint.usagePercentage?.toFixed(1) || '0.0'}%
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl glass hover-lift transition-all duration-500">
      {/* 装饰性渐变背景 */}
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600"></div>
      
      {/* 装饰性光效 */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full blur-3xl transform -translate-x-32 -translate-y-32"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-indigo-600/10 rounded-full blur-3xl transform translate-x-32 translate-y-32"></div>
      
      <div className="relative p-4 sm:p-6">
        {/* 头部区域 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
              {activeTab === 'today' ? <BarChart3 className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {activeTab === 'today' ? '当日余额变化趋势' : '近30天使用统计'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activeTab === 'today' ? '显示当日当前余额 (预算 - 已用) 的变化' : '显示最近30天的每日使用量情况'}
              </p>
            </div>
          </div>
          
          {/* Tab切换和趋势指示器 */}
          <div className="flex items-center gap-4">
            {/* Tab切换按钮 */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('today')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'today'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                今日
              </button>
              <button
                onClick={() => setActiveTab('30days')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
                  activeTab === '30days'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                30天
              </button>
            </div>
          </div>
        </div>
        
        {/* 图表容器 */}
        <div className="relative">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'today' ? (
                <LineChart 
                  data={chartData} 
                  margin={{ top: 10, right: 10, left: -20, bottom: -5 }}
                  style={{ outline: 'none' }}
                >
                <defs>
                  {/* 余额线条渐变 */}
                  <linearGradient id="balanceLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                  
                  {/* 网格渐变 - 亮色模式 */}
                  <linearGradient id="gridGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#E5E7EB" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#6B7280" stopOpacity={0.1}/>
                  </linearGradient>
                  
                  {/* 网格渐变 - 暗色模式 */}
                  <linearGradient id="gridGradientDark" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#374151" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#9CA3AF" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme === 'dark' ? "url(#gridGradientDark)" : "url(#gridGradient)"}
                  strokeOpacity={0.6}
                />
                
                <XAxis 
                  dataKey="hourNumber" 
                  type="number"
                  scale="linear"
                  domain={[0, 24]}
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-gray-500 dark:text-gray-400"
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]}
                  tickFormatter={(value) => `${Math.floor(value).toString().padStart(2, '0')}:00`}
                />
                
                <YAxis 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-gray-500 dark:text-gray-400"
                  axisLine={false}
                  tickLine={false}
                  domain={[-1, dailyBudget + 1]}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                {/* 余额折线图 */}
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="url(#balanceLineGradient)"
                  strokeWidth={3}
                  dot={false} // 隐藏所有数据点，创建平滑曲线
                  activeDot={{ 
                    r: 6, 
                    fill: '#3B82F6',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    className: 'drop-shadow-xl animate-pulse'
                  }}
                  connectNulls={true} // 连接所有点创建平滑曲线
                />
                </LineChart>
              ) : (
                <BarChart
                  data={monthlyChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: -15 }}
                  style={{ outline: 'none' }}
                >
                  <defs>
                    {/* 柱状图渐变 - 与折线图保持一致 */}
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={theme === 'dark' ? "url(#gridGradientDark)" : "url(#gridGradient)"}
                    strokeOpacity={0.6}
                  />
                  
                  <XAxis 
                    dataKey="dateDisplay"
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-gray-500 dark:text-gray-400"
                    axisLine={false}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    className="text-gray-500 dark:text-gray-400"
                    axisLine={false}
                    tickLine={false}
                  />
                  
                  <Tooltip content={<MonthlyTooltip />} />
                  
                  <Bar
                    dataKey="usage"
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* 数据为空时的占位图 */}
          {(activeTab === 'today' && actualDataPoints.length === 0) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <BarChart3 className="w-16 h-16 mx-auto opacity-50" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-center font-medium">
                暂无今日数据
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center mt-2">
                数据将在首次收集后显示
              </p>
            </div>
          )}
        </div>
        
        {/* 图例和统计信息 */}
        <div className="mt-2 space-y-2">
          {/* 图例 */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-3 rounded-sm shadow-sm ${
                activeTab === 'today' 
                  ? 'bg-gradient-to-r from-blue-400 to-purple-600' 
                  : 'bg-gradient-to-b from-blue-500 to-blue-700'
              }`}></div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {activeTab === 'today' ? '当前余额' : '日使用量'}
              </span>
            </div>
          </div>
          
          {/* 统计摘要 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            {activeTab === 'today' ? (
              [
                { label: '数据点', value: actualDataPoints.length },
                { label: '最高余额', value: validBalances.length > 0 ? `$${Math.max(...validBalances).toFixed(2)}` : '$0.00' },
                { label: '最低余额', value: validBalances.length > 0 ? `$${Math.min(...validBalances).toFixed(2)}` : '$0.00' },
                { label: '变化幅度', value: `$${Math.abs(trend).toFixed(2)}` },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              ))
            ) : (
              [
                { label: '数据天数', value: monthlyChartData.length },
                { label: '最高单日', value: monthlyChartData.length > 0 ? `$${Math.max(...monthlyChartData.map(d => d.usage)).toFixed(2)}` : '$0.00' },
                { label: '最低单日', value: monthlyChartData.length > 0 ? `$${Math.min(...monthlyChartData.map(d => d.usage)).toFixed(2)}` : '$0.00' },
                { label: '平均使用', value: monthlyChartData.length > 0 ? `$${(monthlyChartData.reduce((sum, d) => sum + d.usage, 0) / monthlyChartData.length).toFixed(2)}` : '$0.00' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}