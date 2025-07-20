'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format, startOfDay, addHours } from 'date-fns'
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react'
import { useTheme } from 'next-themes'

interface UsageChartProps {
  data: any[]
}

export function UsageChart({ data }: UsageChartProps) {
  const { theme } = useTheme()
  
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

  // 计算趋势
  const validBalances = chartData.filter(d => d.balance !== null).map(d => d.balance as number)
  const trend = validBalances.length > 1 
    ? validBalances[validBalances.length - 1] - validBalances[0]
    : 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      return (
        <div className="glass rounded-xl p-4 shadow-2xl border border-white/20 dark:border-gray-700/50">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{`时间: ${label}`}</p>
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

  return (
    <div className="group relative overflow-hidden rounded-2xl glass hover-lift transition-all duration-500">
      {/* 装饰性渐变背景 */}
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600"></div>
      
      {/* 装饰性光效 */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full blur-3xl transform -translate-x-32 -translate-y-32"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-indigo-600/10 rounded-full blur-3xl transform translate-x-32 translate-y-32"></div>
      
      <div className="relative p-6 sm:p-8">
        {/* 头部区域 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                当日余额变化趋势
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                显示当日当前余额 (预算 - 已用) 的变化
              </p>
            </div>
          </div>
          
          {/* 趋势指示器 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : trend < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-gray-400" />
              )}
              <span className={`text-sm font-medium ${
                trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500'
              }`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(4)}
              </span>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl glass">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                实时更新
              </span>
            </div>
          </div>
        </div>
        
        {/* 图表容器 */}
        <div className="relative">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
                  domain={[-1, dailyBudget]}
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
            </ResponsiveContainer>
          </div>
          
          {/* 数据为空时的占位图 */}
          {actualDataPoints.length === 0 && (
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
        <div className="mt-1 space-y-4">
          {/* 图例 */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-gradient-to-r from-blue-400 to-purple-600 rounded-sm shadow-sm"></div>
              <span className="font-medium text-gray-700 dark:text-gray-300">当前余额</span>
            </div>
          </div>
          
          {/* 统计摘要 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            {[
              { label: '数据点', value: actualDataPoints.length },
              { label: '最高余额', value: validBalances.length > 0 ? `$${Math.max(...validBalances).toFixed(2)}` : '$0.00' },
              { label: '最低余额', value: validBalances.length > 0 ? `$${Math.min(...validBalances).toFixed(2)}` : '$0.00' },
              { label: '变化幅度', value: `$${Math.abs(trend).toFixed(2)}` },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}