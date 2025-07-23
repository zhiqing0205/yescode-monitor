'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, startOfDay, addHours, subDays, isSameDay } from 'date-fns'
import { BarChart3, TrendingDown, TrendingUp, Calendar, Clock, Brain, AlertCircle, CheckCircle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { predictDailyUsage, type PredictionResult, type DataPoint } from '@/lib/timeSeriesPrediction'
import { DatePicker } from '@/components/DatePicker'

interface UsageChartProps {
  data: any[]
  monthlyData?: any[] // 新增30天数据
}

// 使用React.memo防止不必要的重新渲染
export const UsageChart = React.memo(function UsageChart({ data, monthlyData = [] }: UsageChartProps) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<'today' | 'yesterday' | '30days' | 'custom'>('today')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false)
  
  // 直接使用本地时间，因为环境已经是东八区
  const today = startOfDay(new Date())
  const yesterday = startOfDay(subDays(new Date(), 1))
  
  // 获取有数据的日期列表
  const availableDates = useMemo(() => {
    const dates = new Set<string>()
    data.forEach(record => {
      // 直接使用数据库时间，系统环境已经是东八区
      const recordTime = new Date(record.timestamp)
      const recordDate = startOfDay(recordTime)
      const dateKey = format(recordDate, 'yyyy-MM-dd')
      dates.add(dateKey)
    })
    
    const sortedDates = Array.from(dates)
      .map(dateStr => startOfDay(new Date(dateStr)))
      .sort((a, b) => b.getTime() - a.getTime())
    
    // 调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('📅 Available dates found:', sortedDates.map(d => format(d, 'yyyy-MM-dd')))
      console.log('📊 Total data records:', data.length)
      
      // 显示所有数据记录的日期分布
      const dateDistribution = new Map()
      data.forEach(r => {
        const recordTime = new Date(r.timestamp)
        const dateKey = format(startOfDay(recordTime), 'yyyy-MM-dd')
        dateDistribution.set(dateKey, (dateDistribution.get(dateKey) || 0) + 1)
      })
      console.log('📊 Date distribution:', Object.fromEntries(dateDistribution))
      console.log('📊 Unique dates in data:', Array.from(dates).sort())
      
      console.log('📊 Sample record timestamps:', data.slice(0, 5).map(r => {
        const recordTime = new Date(r.timestamp)
        return {
          timestamp: r.timestamp,
          localTime: format(recordTime, 'yyyy-MM-dd HH:mm:ss'),
          localDate: format(startOfDay(recordTime), 'yyyy-MM-dd')
        }
      }))
      
      // 显示今天和昨天的具体时间
      console.log('📅 Date references:', {
        today: format(today, 'yyyy-MM-dd HH:mm:ss'),
        yesterday: format(yesterday, 'yyyy-MM-dd HH:mm:ss'),
        todayTimestamp: today.getTime(),
        yesterdayTimestamp: yesterday.getTime()
      })
    }
    
    return sortedDates
  }, [data])
  
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
  
  // 获取目标日期 - 根据activeTab和selectedDate决定
  const getTargetDate = () => {
    switch (activeTab) {
      case 'today':
        return today
      case 'yesterday':
        return yesterday
      case 'custom':
        return selectedDate ? startOfDay(selectedDate) : today
      default:
        return today
    }
  }
  
  const targetDate = getTargetDate()
  
  // 添加目标日期调试信息
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 Target date info:', {
      activeTab,
      selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      targetDate: format(targetDate, 'yyyy-MM-dd'),
      today: format(today, 'yyyy-MM-dd'),
      yesterday: format(yesterday, 'yyyy-MM-dd')
    })
  }
  
  // 处理实际数据点 - 根据目标日期过滤
  const actualDataPoints = data
    .filter(record => {
      // 直接使用数据库时间，系统环境已经是东八区
      const recordTime = new Date(record.timestamp)
      const recordDay = startOfDay(recordTime)
      const targetDayTime = targetDate.getTime()
      const recordDayTime = recordDay.getTime()
      
      const match = recordDayTime === targetDayTime
      
      // 添加调试信息 - 只显示前5个记录和匹配的记录
      if (process.env.NODE_ENV === 'development') {
        const recordIndex = data.indexOf(record)
        if (recordIndex < 5 || match) {
          console.log(`🔍 Date comparison [${recordIndex}]:`, {
            targetDate: format(targetDate, 'yyyy-MM-dd'),
            recordDate: format(recordDay, 'yyyy-MM-dd'), 
            match,
            recordTimestamp: record.timestamp,
            localTime: format(recordTime, 'yyyy-MM-dd HH:mm:ss'),
            targetTimestamp: targetDayTime,
            recordDayTimestamp: recordDayTime
          })
        }
      }
      
      return match
    })
    .map(record => {
      // 直接使用数据库时间，系统环境已经是东八区
      const recordTime = new Date(record.timestamp)
      const currentBalance = parseFloat(record.dailyBudgetUsd) - parseFloat(record.dailySpentUsd)
      
      const hourNumber = recordTime.getHours() + recordTime.getMinutes() / 60
      
      return {
        hour: format(recordTime, 'HH:mm'),
        hourNumber: hourNumber, // 精确到分钟
        balance: parseFloat(currentBalance.toFixed(2)),
        timestamp: recordTime.getTime(),
        hasData: true,
        dailyBudget: parseFloat(record.dailyBudgetUsd)
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    
  console.log('📊 Processed actual data points:', actualDataPoints.map(p => ({
    time: p.hour,
    hourNumber: p.hourNumber.toFixed(3),
    balance: p.balance,
    budgetUsed: p.dailyBudget,
    rawRecord: data.find(r => new Date(r.timestamp).getTime() === p.timestamp)
  })))

  // 处理昨日数据点
  const yesterdayDataPoints = data
    .filter(record => {
      // 直接使用数据库时间，系统环境已经是东八区
      const recordTime = new Date(record.timestamp)
      const recordDay = startOfDay(recordTime)
      return recordDay.getTime() === yesterday.getTime()
    })
    .map(record => {
      // 直接使用数据库时间
      const recordTime = new Date(record.timestamp)
      const currentBalance = parseFloat(record.dailyBudgetUsd) - parseFloat(record.dailySpentUsd)
      
      return {
        hour: format(recordTime, 'HH:mm'),
        hourNumber: recordTime.getHours() + recordTime.getMinutes() / 60,
        balance: parseFloat(currentBalance.toFixed(2)),
        timestamp: recordTime.getTime(),
        hasData: true,
        dailyBudget: parseFloat(record.dailyBudgetUsd)
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)

  // 获取预算值用于Y轴范围
  const dailyBudget = actualDataPoints.length > 0 ? actualDataPoints[0].dailyBudget : 
                     yesterdayDataPoints.length > 0 ? yesterdayDataPoints[0].dailyBudget : 25

  // 预测功能 - 在今日标签页时启用
  useEffect(() => {
    if (activeTab === 'today' && actualDataPoints.length > 0) {
      console.log('🔮 Starting prediction for today tab with', actualDataPoints.length, 'data points')
      console.log('💰 Daily budget:', dailyBudget)
      
      setIsLoadingPrediction(true)
      
      // 准备预测数据
      const predictionData: DataPoint[] = actualDataPoints.map(point => {
        const dailySpent = dailyBudget - point.balance // 计算已花费
        return {
          timestamp: point.timestamp,
          balance: point.balance,
          dailySpent: dailySpent,
          hourNumber: point.hourNumber
        }
      })
      
      console.log('🎯 Prediction input data:', predictionData.length, 'points')
      
      predictDailyUsage(predictionData, dailyBudget)
        .then(result => {
          console.log('✅ Prediction result received:', result)
          setPrediction(result)
          setIsLoadingPrediction(false)
        })
        .catch(error => {
          console.error('❌ Prediction failed with error:', error)
          setPrediction(null)
          setIsLoadingPrediction(false)
        })
    } else {
      console.log('⏸️ Not predicting - activeTab:', activeTab, 'dataPoints:', actualDataPoints.length)
      if (activeTab !== 'today') {
        setPrediction(null)
        setIsLoadingPrediction(false)
      }
    }
  }, [activeTab, actualDataPoints.length, dailyBudget]) // 恢复activeTab依赖
  
  // 处理日期选择
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setActiveTab('custom')
    setPrediction(null) // 清除预测结果，因为只有今日才显示预测
  }
  
  // 处理30天柱状图点击
  const handleBarClick = (data: any) => {
    if (data && data.date) {
      const clickedDate = new Date(data.date)
      handleDateSelect(clickedDate)
    }
  }

  // 只使用实际数据点来绘制图表
  const rawChartData = activeTab === 'yesterday' ? yesterdayDataPoints : actualDataPoints
  
  // 合并实际数据和预测数据用于图表显示
  const combinedChartData = useMemo(() => {
    if (activeTab === 'today' && prediction && prediction.predictionData.length > 0) {
      console.log('🔄 Combining chart data')
      console.log('📊 Prediction data from API:', prediction.predictionData.length)
      console.log('🔍 Raw prediction data sample:', prediction.predictionData.slice(0, 3))
      
      // 创建一个完整的时间轴数据，包含实际值和预测值
      const fullData = []
      
      // 添加实际数据点
      const actualPoints = prediction.predictionData.filter(point => !point.isPredicted)
      console.log('📈 Actual points from prediction:', actualPoints.length)
      for (const point of actualPoints) {
        fullData.push({
          hourNumber: point.hourNumber,
          balance: point.balance,
          predictedBalance: null,
          timestamp: point.timestamp,
          hour: point.hour,
          hasData: true,
          isPredicted: false
        })
      }
      
      // 添加预测数据点
      const predictedPoints = prediction.predictionData.filter(point => point.isPredicted)
      console.log('🔮 Predicted points from prediction:', predictedPoints.length)
      for (const point of predictedPoints) {
        fullData.push({
          hourNumber: point.hourNumber,
          balance: null,
          predictedBalance: point.balance,
          timestamp: point.timestamp,
          hour: point.hour,
          hasData: false,
          isPredicted: true
        })
      }
      
      const sortedData = fullData.sort((a, b) => a.hourNumber - b.hourNumber)
      console.log('📈 Combined chart data:', sortedData.length)
      console.log('🎯 Sample combined data:', sortedData.slice(0, 3))
      console.log('🔮 Predicted points in combined:', sortedData.filter(d => d.predictedBalance !== null).length)
      
      return sortedData
    }
    console.log('📊 Using raw chart data:', rawChartData.length)
    console.log('🔍 Prediction available:', !!prediction)
    console.log('📉 Prediction data length:', prediction?.predictionData?.length || 0)
    return rawChartData.map(point => ({
      ...point,
      predictedBalance: null,
      isPredicted: false
    }))
  }, [activeTab, prediction, rawChartData])
  
  // 检查是否需要显示数据点（当数据点较少或余额相同时）
  const shouldShowDots = rawChartData.length <= 3 || 
    (rawChartData.length > 0 && rawChartData.every(point => point.balance === rawChartData[0].balance))
  
  // 检查预测数据是否为水平线
  const shouldShowPredictionDots = prediction && combinedChartData.some(d => d.predictedBalance !== null) &&
    combinedChartData.filter(d => d.predictedBalance !== null).every((point, index, arr) => 
      index === 0 || point.predictedBalance === arr[0].predictedBalance
    )
  
  // 修复水平线显示问题
  let chartData = combinedChartData
  
  // 处理单点数据或所有实际数据相同的情况
  if (rawChartData.length === 1 && (!prediction || prediction.predictionData.length <= 1)) {
    // 复制第一个点并稍微调整时间，确保有连线
    const firstPoint = rawChartData[0]
    const secondPoint = {
      ...firstPoint,
      hourNumber: firstPoint.hourNumber + 0.01, // 稍微增加时间
      hour: firstPoint.hour, // 保持显示时间相同
      predictedBalance: null,
      isPredicted: false
    }
    chartData = [firstPoint, secondPoint].map(point => ({
      ...point,
      predictedBalance: null,
      isPredicted: false
    }))
  } else if (rawChartData.length > 1 && rawChartData.every(point => point.balance === rawChartData[0].balance)) {
    // 处理多个相同值的实际数据 - 确保线条可见
    console.log('📏 Detected flat actual data line, ensuring visibility')
    // 保持原始数据结构不变
    chartData = combinedChartData
  }
  
  // 处理预测数据为水平线的情况
  if (prediction && chartData.some(d => d.predictedBalance !== null)) {
    const predictedPoints = chartData.filter(d => d.predictedBalance !== null)
    if (predictedPoints.length > 1 && predictedPoints.every(point => point.predictedBalance === predictedPoints[0].predictedBalance)) {
      console.log('📏 Detected flat prediction line, ensuring visibility')
      // 预测线为水平线时，保持原始数据结构
      // chartData 已经包含正确的预测数据，无需额外处理
    }
  }
  
  // 获取预测状态颜色
  const getPredictionStatus = () => {
    if (!prediction) return { color: 'gray', label: '暂无预测' }
    
    if (prediction.willExceedBudget || prediction.predictedEndTime) {
      return { color: 'red', label: '预警' }
    } else if (prediction.predictedSpent > dailyBudget * 0.8) {
      return { color: 'orange', label: '提醒' }
    } else {
      return { color: 'green', label: '正常' }
    }
  }
  
  const predictionStatus = getPredictionStatus()

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
  const validBalances = rawChartData.filter(d => d.balance !== null).map(d => d.balance as number)
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
          
          {/* 实际余额显示 */}
          {dataPoint.hasData || (!dataPoint.isPredicted && dataPoint.balance !== null) ? (
            <div className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: payload.find((p: any) => p.dataKey === 'balance')?.color || '#3B82F6' }}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  当前余额
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                ${(dataPoint.balance || 0).toFixed(2)}
              </span>
            </div>
          ) : null}
          
          {/* 预测余额显示 */}
          {dataPoint.isPredicted && dataPoint.predictedBalance !== null ? (
            <div className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <svg width="12" height="3" className="opacity-80">
                  <line 
                    x1="0" y1="1.5" x2="12" y2="1.5" 
                    stroke="#F97316" 
                    strokeWidth="2" 
                    strokeDasharray="3 2"
                  />
                </svg>
                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  AI预测余额
                </span>
              </div>
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                ${(dataPoint.predictedBalance || 0).toFixed(2)}
              </span>
            </div>
          ) : null}
          
          {/* 如果没有数据显示暂无数据 */}
          {!dataPoint.hasData && !dataPoint.isPredicted && dataPoint.balance === null ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
          ) : null}
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
              {activeTab === '30days' ? <Calendar className="w-6 h-6" /> : activeTab === 'today' ? <Brain className="w-6 h-6" /> : <BarChart3 className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {activeTab === 'today' ? '当日余额变化趋势' : 
                 activeTab === 'yesterday' ? '昨日余额变化趋势' : 
                 activeTab === 'custom' && selectedDate ? `${format(selectedDate, 'MM月dd日')} 余额变化趋势` :
                 '近30天使用统计'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activeTab === 'today' ? '显示当日当前余额 (预算 - 已用) 的变化' : 
                 activeTab === 'yesterday' ? '显示昨日余额 (预算 - 已用) 的变化' : 
                 activeTab === 'custom' && selectedDate ? `显示 ${format(selectedDate, 'yyyy-MM-dd')} 余额 (预算 - 已用) 的变化` :
                 '显示最近30天的每日使用量情况'}
              </p>
            </div>
          </div>
          
          {/* Tab切换和趋势指示器 */}
          <div className="flex items-center gap-4">
            {/* 预测信息显示 - 仅在今日标签页显示 */}
            {activeTab === 'today' && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {isLoadingPrediction ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-base">AI预测计算中...</span>
                  </div>
                ) : prediction ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        predictionStatus.color === 'red' ? 'bg-red-500' :
                        predictionStatus.color === 'orange' ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}></div>
                      <span className={`font-medium text-base ${
                        predictionStatus.color === 'red' ? 'text-red-500' :
                        predictionStatus.color === 'orange' ? 'text-orange-500' :
                        'text-green-500'
                      }`}>
                        {predictionStatus.label}
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-base">
                      预计消耗: <span className="font-mono font-bold text-gray-900 dark:text-white">${prediction.predictedSpent.toFixed(2)}</span>
                    </div>
                    {prediction.predictedEndTime && (
                      <div className="text-red-600 dark:text-red-400 font-semibold text-base">
                        预计{prediction.predictedEndTime}耗尽余额
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
            
            {/* 日历按钮和Tab切换按钮 */}
            <div className="flex items-center gap-3">
              {/* 日历选择器 */}
              <DatePicker 
                availableDates={availableDates}
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate || undefined}
              />
              
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
                onClick={() => setActiveTab('yesterday')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'yesterday'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                昨日
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
        </div>
        
        {/* 图表容器 */}
        <div className="relative">
          <div 
            className="h-80 w-full focus:outline-none" 
            style={{ outline: 'none', border: 'none' }} 
            tabIndex={-1}
            onFocus={(e) => e.target.blur()}
          >
            <ResponsiveContainer 
              width="100%" 
              height="100%" 
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
            >
              {activeTab === '30days' ? (
                <BarChart
                  data={monthlyChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: -5 }}
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                >
                  <defs>
                    {/* 柱状图渐变 - 与折线图保持一致 */}
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
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
                    onClick={handleBarClick}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              ) : (
                <LineChart 
                  data={chartData} 
                  margin={{ top: 10, right: 10, left: -20, bottom: -5 }}
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                >
                <defs>
                  {/* 余额线条渐变 */}
                  <linearGradient id="balanceLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                  
                  {/* 预测线条渐变 - 橙色到粉色 */}
                  <linearGradient id="predictedLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F97316" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#EC4899" stopOpacity="0.8" />
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
                
                {/* 实际数据折线图 */}
                <Line
                  type="linear"
                  dataKey="balance"
                  stroke="url(#balanceLineGradient)"
                  strokeWidth={3}
                  dot={shouldShowDots ? {
                    r: 4,
                    fill: '#3B82F6',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    className: 'drop-shadow-lg'
                  } : false}
                  activeDot={{ 
                    r: 6, 
                    fill: '#3B82F6',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    className: 'drop-shadow-xl animate-pulse'
                  }}
                  connectNulls={false}
                />
                
                {/* 预测数据虚线 */}
                <Line
                  type="linear"
                  dataKey="predictedBalance"
                  stroke="url(#predictedLineGradient)"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  dot={shouldShowPredictionDots ? {
                    r: 3,
                    fill: '#F97316',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    className: 'drop-shadow-lg'
                  } : false}
                  activeDot={{
                    r: 4,
                    fill: '#F97316',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* 数据为空时的占位图 */}
          {((activeTab === 'today' && actualDataPoints.length === 0) || 
            (activeTab === 'yesterday' && yesterdayDataPoints.length === 0) ||
            (activeTab === 'custom' && actualDataPoints.length === 0)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <BarChart3 className="w-16 h-16 mx-auto opacity-50" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-center font-medium">
                {activeTab === 'today' ? '暂无今日数据' : 
                 activeTab === 'yesterday' ? '暂无昨日数据' :
                 activeTab === 'custom' && selectedDate ? `暂无 ${format(selectedDate, 'yyyy-MM-dd')} 数据` :
                 '暂无数据'}
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
                activeTab === '30days'
                  ? 'bg-gradient-to-b from-blue-500 to-purple-600' 
                  : 'bg-gradient-to-r from-blue-400 to-purple-600'
              }`}></div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {(activeTab === 'today' || activeTab === 'yesterday') ? '当前余额' : '日使用量'}
              </span>
            </div>
            
            {/* LSTM预测线图例 - 仅在今日标签页且有预测数据时显示 */}
            {activeTab === 'today' && prediction && chartData.some(d => d.predictedBalance !== null) && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm shadow-sm bg-gradient-to-r from-orange-400 to-pink-500"></div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  AI预测余额
                </span>
              </div>
            )}
          </div>
          
          {/* 统计摘要 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
            {(activeTab === 'today' || activeTab === 'yesterday' || activeTab === 'custom') ? (
              [
                { label: '数据点', value: rawChartData.length },
                { label: '最高余额', value: rawChartData.length > 0 ? `$${Math.max(...rawChartData.map(d => d.balance)).toFixed(2)}` : '$0.00' },
                { label: '最低余额', value: rawChartData.length > 0 ? `$${Math.min(...rawChartData.map(d => d.balance)).toFixed(2)}` : '$0.00' },
                { label: '变化幅度', value: rawChartData.length > 1 ? `$${Math.abs(rawChartData[rawChartData.length - 1].balance - rawChartData[0].balance).toFixed(2)}` : '$0.00' },
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
})