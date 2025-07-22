import { format, startOfDay } from 'date-fns'

export interface DataPoint {
  timestamp: number
  balance: number
  dailySpent: number
  hourNumber: number
}

export interface PredictionResult {
  predictedSpent: number
  predictedEndTime: string | null
  willExceedBudget: boolean
  predictionData: Array<{
    hourNumber: number
    balance: number
    timestamp: number
    hour: string
    isPredicted: boolean
  }>
  confidence: 'high' | 'medium' | 'low'
}

// 简单的线性回归时序预测
const simpleTimeSeriesPrediction = (balanceArray: number[], timestamps: number[], predictCount: number) => {
  console.log('📈 Simple time series prediction with', balanceArray.length, 'points')
  
  if (balanceArray.length < 2) {
    console.log('⚠️ Need at least 2 points for prediction')
    return null
  }

  // 使用最近5个点进行预测（如果有的话）
  const windowSize = Math.min(5, balanceArray.length)
  const recentBalances = balanceArray.slice(-windowSize)
  const recentTimestamps = timestamps.slice(-windowSize)
  
  console.log('📊 Using', windowSize, 'recent points for prediction')
  console.log('📈 Recent balances:', recentBalances)
  
  // 计算线性回归参数
  const n = recentBalances.length
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += recentBalances[i]
    sumXY += i * recentBalances[i]
    sumXX += i * i
  }
  
  // 计算斜率和截距
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  console.log('📐 Linear regression: slope=', slope.toFixed(6), 'intercept=', intercept.toFixed(4))
  
  // 如果斜率为正（余额增长），使用保守的微小下降
  const finalSlope = slope > 0 ? -0.001 : slope
  
  console.log('📐 Adjusted slope:', finalSlope.toFixed(6))
  
  // 生成预测
  const predictions = []
  const lastBalance = balanceArray[balanceArray.length - 1]
  
  for (let i = 1; i <= predictCount; i++) {
    const predictedBalance = Math.max(0, lastBalance + finalSlope * i * 12) // 每5分钟*12=1小时的变化
    predictions.push(predictedBalance)
    
    if (i <= 3) {
      console.log(`🔮 Step ${i}: ${lastBalance.toFixed(4)} + ${finalSlope.toFixed(6)} * ${i} * 12 = ${predictedBalance.toFixed(4)}`)
    }
    
    if (predictedBalance <= 0) {
      console.log('🛑 Predicted depletion at step', i)
      break
    }
  }
  
  console.log('✅ Generated', predictions.length, 'predictions')
  return predictions
}

// 移动平均预测（备选方案）
const movingAveragePrediction = (balanceArray: number[], predictCount: number) => {
  console.log('📊 Moving average prediction with', balanceArray.length, 'points')
  
  if (balanceArray.length < 3) {
    return null
  }
  
  const windowSize = Math.min(3, balanceArray.length)
  const recent = balanceArray.slice(-windowSize)
  
  // 计算移动平均的变化率
  let totalChange = 0
  for (let i = 1; i < recent.length; i++) {
    totalChange += recent[i] - recent[i-1]
  }
  
  const avgChange = totalChange / (recent.length - 1)
  console.log('📉 Average change per period:', avgChange.toFixed(6))
  
  const predictions = []
  let currentBalance = balanceArray[balanceArray.length - 1]
  
  for (let i = 1; i <= predictCount; i++) {
    currentBalance = Math.max(0, currentBalance + avgChange)
    predictions.push(currentBalance)
    
    if (currentBalance <= 0) {
      console.log('🛑 Moving average predicted depletion at step', i)
      break
    }
  }
  
  return predictions
}

// 主预测函数
export async function predictDailyUsage(
  rawData: DataPoint[], 
  dailyBudget: number
): Promise<PredictionResult> {
  
  console.log('🚀 Starting lightweight prediction')
  console.log('📊 Raw data points:', rawData.length)
  console.log('💰 Daily budget:', dailyBudget)
  
  if (rawData.length === 0) {
    console.log('⚠️ No raw data provided')
    return {
      predictedSpent: 0,
      predictedEndTime: null,
      willExceedBudget: false,
      predictionData: [],
      confidence: 'low'
    }
  }

  // 按时间排序
  const sortedData = [...rawData].sort((a, b) => a.timestamp - b.timestamp)
  const lastPoint = sortedData[sortedData.length - 1]
  console.log('🎯 Last data point balance:', lastPoint.balance)
  
  // 提取数据用于预测
  const balanceArray = sortedData.map(point => point.balance)
  const timestamps = sortedData.map(point => point.timestamp)
  
  // 计算需要预测的点数
  const currentHour = lastPoint.hourNumber
  const remainingMinutes = (24 - currentHour) * 60
  const predictCount = Math.min(Math.ceil(remainingMinutes / 5), 50) // 限制预测数量
  
  console.log('⏰ Current hour:', currentHour.toFixed(3), 'Predict count:', predictCount)

  // 尝试时序预测
  let predictedBalances = null
  let confidence: 'high' | 'medium' | 'low' = 'low'
  
  if (balanceArray.length >= 3) {
    predictedBalances = simpleTimeSeriesPrediction(balanceArray, timestamps, predictCount)
    if (predictedBalances && predictedBalances.length > 0) {
      confidence = balanceArray.length >= 5 ? 'high' : 'medium'
      console.log('✅ Time series prediction successful')
    } else {
      // 备选：移动平均
      predictedBalances = movingAveragePrediction(balanceArray, predictCount)
      confidence = 'medium'
      console.log('✅ Moving average prediction used')
    }
  }
  
  if (!predictedBalances || predictedBalances.length === 0) {
    console.log('❌ No predictions generated, returning current balance as final')
    const currentPredictedSpent = Math.max(0, dailyBudget - lastPoint.balance)
    return {
      predictedSpent: currentPredictedSpent,
      predictedEndTime: null,
      willExceedBudget: lastPoint.balance <= 0,
      predictionData: [],
      confidence: 'low'
    }
  }
  
  console.log('🔮 Predictions:', predictedBalances.slice(0, 5), '...(', predictedBalances.length, 'total)')
  
  // 构建预测数据
  const today = startOfDay(new Date())
  const predictionData = []
  
  // 添加实际数据点
  for (const point of sortedData) {
    predictionData.push({
      hourNumber: point.hourNumber,
      balance: point.balance,
      timestamp: point.timestamp,
      hour: format(new Date(point.timestamp), 'HH:mm'),
      isPredicted: false
    })
  }
  
  // 添加连接点和预测点
  const minuteInterval = 5
  const hourInterval = minuteInterval / 60
  const connectionHour = currentHour + 0.001
  
  predictionData.push({
    hourNumber: connectionHour,
    balance: lastPoint.balance,
    timestamp: today.getTime() + (connectionHour * 60 * 60 * 1000),
    hour: format(new Date(today.getTime() + (connectionHour * 60 * 60 * 1000)), 'HH:mm'),
    isPredicted: true
  })
  
  for (let i = 0; i < predictedBalances.length; i++) {
    const h = currentHour + hourInterval * (i + 1)
    if (h > 24) break
    
    const timestamp = today.getTime() + (h * 60 * 60 * 1000)
    
    predictionData.push({
      hourNumber: h,
      balance: predictedBalances[i],
      timestamp,
      hour: format(new Date(timestamp), 'HH:mm'),
      isPredicted: true
    })
    
    if (predictedBalances[i] <= 0) break
  }
  
  // 关键：修复预测消费计算
  const finalBalance = predictedBalances[predictedBalances.length - 1]
  const predictedSpent = Math.max(0, dailyBudget - finalBalance)
  
  console.log('💸 FIXED Calculation:')
  console.log('  - Daily budget:', dailyBudget)
  console.log('  - Final predicted balance:', finalBalance)
  console.log('  - Predicted spent (budget - final):', predictedSpent)
  
  // 计算耗尽时间
  let predictedEndTime: string | null = null
  const willExceedBudget = finalBalance <= 0
  
  if (willExceedBudget) {
    const zeroBalanceIndex = predictedBalances.findIndex(balance => balance <= 0.01)
    if (zeroBalanceIndex !== -1) {
      const depletionHour = currentHour + hourInterval * (zeroBalanceIndex + 1)
      if (depletionHour <= 24) {
        const depletionTime = new Date(today.getTime() + (depletionHour * 60 * 60 * 1000))
        predictedEndTime = format(depletionTime, 'HH:mm')
        console.log('⏰ Predicted depletion time:', predictedEndTime)
      }
    }
  }
  
  const result = {
    predictedSpent,
    predictedEndTime,
    willExceedBudget,
    predictionData: predictionData.sort((a, b) => a.hourNumber - b.hourNumber),
    confidence
  }
  
  console.log('🎊 Prediction result summary:')
  console.log('  - Predicted spent:', result.predictedSpent.toFixed(2))
  console.log('  - Will exceed:', result.willExceedBudget)
  console.log('  - End time:', result.predictedEndTime)
  console.log('  - Data points:', result.predictionData.length)
  console.log('  - Confidence:', result.confidence)
  
  return result
}