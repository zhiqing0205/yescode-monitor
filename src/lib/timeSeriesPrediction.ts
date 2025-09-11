import { format, startOfDay } from 'date-fns'

export interface DataPoint {
  timestamp: number
  balance: number
  payAsYouGoBalance: number
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
    payAsYouGoBalance: number
    timestamp: number
    hour: string
    isPredicted: boolean
  }>
  confidence: 'high' | 'medium' | 'low'
}

// 指数平滑时序预测（更适合时序数据）- 支持双余额预测
const exponentialSmoothingPrediction = (balanceArray: number[], payAsYouGoArray: number[], predictCount: number) => {
  console.log('📈 Exponential smoothing prediction with', balanceArray.length, 'points for dual balances')
  
  if (balanceArray.length < 2) {
    console.log('⚠️ Need at least 2 points for prediction')
    return null
  }

  // 使用Holt线性指数平滑（双参数）
  const alpha = 0.3  // 水平平滑参数
  const beta = 0.1   // 趋势平滑参数
  
  console.log('⚙️ Using Holt exponential smoothing: alpha=', alpha, 'beta=', beta)
  
  // 预测订阅余额
  let subscriptionLevel = balanceArray[0]
  let subscriptionTrend = balanceArray.length > 1 ? balanceArray[1] - balanceArray[0] : 0
  
  console.log('🎯 Initial subscription level:', subscriptionLevel.toFixed(4), 'trend:', subscriptionTrend.toFixed(6))
  
  // 平滑历史数据，学习模式
  for (let i = 1; i < balanceArray.length; i++) {
    const prevLevel = subscriptionLevel
    subscriptionLevel = alpha * balanceArray[i] + (1 - alpha) * (subscriptionLevel + subscriptionTrend)
    subscriptionTrend = beta * (subscriptionLevel - prevLevel) + (1 - beta) * subscriptionTrend
    
    if (i <= 3) {
      console.log(`📊 Subscription step ${i}: value=${balanceArray[i].toFixed(4)}, level=${subscriptionLevel.toFixed(4)}, trend=${subscriptionTrend.toFixed(6)}`)
    }
  }
  
  // 预测按量付费余额
  let payAsYouGoLevel = payAsYouGoArray[0] || 0
  let payAsYouGoTrend = payAsYouGoArray.length > 1 ? (payAsYouGoArray[1] || 0) - (payAsYouGoArray[0] || 0) : 0
  
  console.log('🎯 Initial payAsYouGo level:', payAsYouGoLevel.toFixed(4), 'trend:', payAsYouGoTrend.toFixed(6))
  
  // 平滑按量付费历史数据
  for (let i = 1; i < payAsYouGoArray.length; i++) {
    const currentPayAsYouGo = payAsYouGoArray[i] || 0
    const prevLevel = payAsYouGoLevel
    payAsYouGoLevel = alpha * currentPayAsYouGo + (1 - alpha) * (payAsYouGoLevel + payAsYouGoTrend)
    payAsYouGoTrend = beta * (payAsYouGoLevel - prevLevel) + (1 - beta) * payAsYouGoTrend
    
    if (i <= 3) {
      console.log(`📊 PayAsYouGo step ${i}: value=${currentPayAsYouGo.toFixed(4)}, level=${payAsYouGoLevel.toFixed(4)}, trend=${payAsYouGoTrend.toFixed(6)}`)
    }
  }
  
  console.log('📐 Final smoothed levels - subscription:', subscriptionLevel.toFixed(4), 'payAsYouGo:', payAsYouGoLevel.toFixed(4))
  
  // 确保预测从最后实际余额开始
  const lastActualSubscription = balanceArray[balanceArray.length - 1]
  const lastActualPayAsYouGo = payAsYouGoArray[payAsYouGoArray.length - 1] || 0
  console.log('🔗 Last actual balances - subscription:', lastActualSubscription.toFixed(4), 'payAsYouGo:', lastActualPayAsYouGo.toFixed(4))
  
  // 生成预测
  const subscriptionPredictions = []
  const payAsYouGoPredictions = []
  let currentSubscriptionLevel = lastActualSubscription
  let currentPayAsYouGoLevel = lastActualPayAsYouGo
  
  for (let i = 1; i <= predictCount; i++) {
    const predictedSubscription = Math.max(0, currentSubscriptionLevel + subscriptionTrend * i)
    const predictedPayAsYouGo = Math.max(0, currentPayAsYouGoLevel + payAsYouGoTrend * i)
    
    subscriptionPredictions.push(predictedSubscription)
    payAsYouGoPredictions.push(predictedPayAsYouGo)
    
    if (i <= 5) {
      console.log(`🔮 Forecast ${i}: subscription=${predictedSubscription.toFixed(4)}, payAsYouGo=${predictedPayAsYouGo.toFixed(4)}`)
    }
    
    // 如果两个余额都为0，停止预测
    if (predictedSubscription <= 0 && predictedPayAsYouGo <= 0) {
      console.log('🛑 Both balances predicted to be depleted at step', i)
      break
    }
  }
  
  console.log('✅ Generated', subscriptionPredictions.length, 'dual balance predictions')
  return { subscription: subscriptionPredictions, payAsYouGo: payAsYouGoPredictions }
}

// ARIMA简化版 - 自回归预测
const autoRegressivePrediction = (balanceArray: number[], predictCount: number) => {
  console.log('📈 Auto-regressive prediction with', balanceArray.length, 'points')
  
  if (balanceArray.length < 4) {
    console.log('⚠️ Need at least 4 points for AR prediction')
    return null
  }

  // 使用AR(2)模型：y(t) = c + φ1*y(t-1) + φ2*y(t-2)
  const order = Math.min(3, balanceArray.length - 1)
  console.log('📊 Using AR(' + order + ') model')
  
  // 计算差分以获得平稳序列
  const diffs = []
  for (let i = 1; i < balanceArray.length; i++) {
    diffs.push(balanceArray[i] - balanceArray[i-1])
  }
  
  console.log('📉 First differences:', diffs.slice(0, 5), '...')
  
  // 简单的最小二乘法估计AR系数
  const n = diffs.length - order
  if (n <= 0) {
    console.log('⚠️ Insufficient data for AR estimation')
    return null
  }
  
  // 构建设计矩阵和响应向量
  const X = []
  const y = []
  
  for (let t = order; t < diffs.length; t++) {
    const row = []
    for (let lag = 1; lag <= order; lag++) {
      row.push(diffs[t - lag])
    }
    X.push(row)
    y.push(diffs[t])
  }
  
  // 简化的最小二乘估计（只使用最近的关系）
  const recentWindow = Math.min(5, X.length)
  const recentX = X.slice(-recentWindow)
  const recentY = y.slice(-recentWindow)
  
  // 计算加权平均系数
  const phi = []
  for (let j = 0; j < order; j++) {
    let numerator = 0
    let denominator = 0
    for (let i = 0; i < recentX.length; i++) {
      numerator += recentX[i][j] * recentY[i]
      denominator += recentX[i][j] * recentX[i][j]
    }
    phi.push(denominator !== 0 ? numerator / denominator : 0)
  }
  
  console.log('📐 AR coefficients:', phi.map(p => p.toFixed(4)))
  
  // 生成预测
  const predictions = []
  let lastValues = balanceArray.slice(-order)
  let lastDiffs = diffs.slice(-order)
  
  // 确保预测从最后实际余额开始
  const lastActualBalance = balanceArray[balanceArray.length - 1]
  console.log('🔗 AR: Last actual balance:', lastActualBalance.toFixed(4))
  
  for (let i = 0; i < predictCount; i++) {
    // 预测下一个差分值
    let predictedDiff = 0
    for (let j = 0; j < order; j++) {
      predictedDiff += phi[j] * lastDiffs[lastDiffs.length - 1 - j]
    }
    
    // 转换回原始水平 - 确保从最后实际余额继续
    const baseBalance = i === 0 ? lastActualBalance : predictions[i - 1]
    const predictedValue = Math.max(0, baseBalance + predictedDiff)
    predictions.push(predictedValue)
    
    if (i < 5) {
      console.log(`🔮 AR step ${i + 1}: base=${baseBalance.toFixed(4)}, diff=${predictedDiff.toFixed(6)}, value=${predictedValue.toFixed(4)}`)
    }
    
    // 更新历史序列
    lastValues = [...lastValues.slice(1), predictedValue]
    lastDiffs = [...lastDiffs.slice(1), predictedDiff]
    
    // 如果余额为0，添加这个点然后停止
    if (predictedValue <= 0) {
      console.log('🛑 AR predicted depletion at step', i + 1)
      break
    }
  }
  
  console.log('✅ Generated', predictions.length, 'auto-regressive predictions')
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
  
  // 确保预测从最后实际余额开始
  const lastActualBalance = balanceArray[balanceArray.length - 1]
  console.log('🔗 MA: Last actual balance:', lastActualBalance.toFixed(4))
  
  const predictions = []
  let currentBalance = lastActualBalance  // 从实际余额开始
  
  for (let i = 1; i <= predictCount; i++) {
    currentBalance = Math.max(0, currentBalance + avgChange)
    predictions.push(currentBalance)
    
    // 如果余额为0，添加这个点然后停止
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
  console.log('🎯 Last data point balance (from subscription_balance):', lastPoint.balance)
  
  // 提取数据用于预测
  const balanceArray = sortedData.map(point => point.balance)
  const payAsYouGoArray = sortedData.map(point => point.payAsYouGoBalance || 0)
  const timestamps = sortedData.map(point => point.timestamp)
  
  console.log('💰 Balance arrays prepared - subscription:', balanceArray.slice(0, 3), '... payAsYouGo:', payAsYouGoArray.slice(0, 3), '...')
  
  // 计算需要预测的点数 - 预测到一天结束或余额为0
  const currentHour = lastPoint.hourNumber
  const remainingMinutes = (24 - currentHour) * 60
  const predictCount = Math.ceil(remainingMinutes / 5) // 移除50的硬性限制
  
  console.log('⏰ Current hour:', currentHour.toFixed(3), 'Remaining minutes:', remainingMinutes.toFixed(1), 'Predict count:', predictCount)

  // 尝试时序预测 - 使用新的轻量级算法
  let dualPredictions = null
  let confidence: 'high' | 'medium' | 'low' = 'low'
  
  if (balanceArray.length >= 3) {
    // 优先使用指数平滑预测
    dualPredictions = exponentialSmoothingPrediction(balanceArray, payAsYouGoArray, predictCount)
    if (dualPredictions && dualPredictions.subscription.length > 0) {
      confidence = balanceArray.length >= 5 ? 'high' : 'medium'
      console.log('✅ Exponential smoothing dual prediction successful')
    }
  }
  
  if (!dualPredictions || dualPredictions.subscription.length === 0) {
    console.log('❌ No dual predictions generated, returning current balances as final')
    const currentPredictedSpent = Math.max(0, dailyBudget - lastPoint.balance)
    return {
      predictedSpent: currentPredictedSpent,
      predictedEndTime: null,
      willExceedBudget: lastPoint.balance <= 0,
      predictionData: [],
      confidence: 'low'
    }
  }
  
  console.log('🔮 Dual Predictions:')
  console.log('   Subscription:', dualPredictions.subscription.slice(0, 5), '...(', dualPredictions.subscription.length, 'total)')
  console.log('   PayAsYouGo:', dualPredictions.payAsYouGo.slice(0, 5), '...(', dualPredictions.payAsYouGo.length, 'total)')
  
  // 构建预测数据
  const today = startOfDay(new Date())
  const predictionData = []
  
  // 添加实际数据点
  for (const point of sortedData) {
    predictionData.push({
      hourNumber: point.hourNumber,
      balance: point.balance,
      payAsYouGoBalance: point.payAsYouGoBalance || 0,
      timestamp: point.timestamp,
      hour: format(new Date(point.timestamp), 'HH:mm'),
      isPredicted: false
    })
  }
  
  // 添加预测点 - 直接从最后实际数据点开始，确保平滑连接
  const minuteInterval = 5
  const hourInterval = minuteInterval / 60
  
  // 添加所有预测点，直接从下一个时间点开始，确保余额连续性
  for (let i = 0; i < Math.min(dualPredictions.subscription.length, dualPredictions.payAsYouGo.length); i++) {
    const h = currentHour + hourInterval * (i + 1)
    if (h >= 24) {
      console.log('🕛 Reached end of day at hour', h.toFixed(3))
      break
    }
    
    const timestamp = today.getTime() + (h * 60 * 60 * 1000)
    const predictedBalance = dualPredictions.subscription[i]
    const predictedPayAsYouGo = dualPredictions.payAsYouGo[i]
    
    predictionData.push({
      hourNumber: h,
      balance: predictedBalance,
      payAsYouGoBalance: predictedPayAsYouGo,
      timestamp,
      hour: format(new Date(timestamp), 'HH:mm'),
      isPredicted: true
    })
    
    // 如果预测余额都为0或负数，这是最后一个预测点
    if (predictedBalance <= 0 && predictedPayAsYouGo <= 0) {
      console.log('🛑 Reached zero balances at hour', h.toFixed(3))
      break
    }
  }
  
  console.log('📊 Total prediction data points:', predictionData.length, '(actual + predicted)')
  
  // 关键：修复预测消费计算
  const finalBalance = dualPredictions.subscription[dualPredictions.subscription.length - 1]
  const predictedSpent = Math.max(0, dailyBudget - finalBalance)
  
  console.log('💸 FIXED Calculation:')
  console.log('  - Daily budget:', dailyBudget)
  console.log('  - Final predicted subscription balance:', finalBalance)
  console.log('  - Predicted spent (budget - final):', predictedSpent)
  
  // 计算耗尽时间 - 基于订阅余额
  let predictedEndTime: string | null = null
  const willExceedBudget = finalBalance <= 0
  
  if (willExceedBudget) {
    const zeroBalanceIndex = dualPredictions.subscription.findIndex(balance => balance <= 0.01)
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