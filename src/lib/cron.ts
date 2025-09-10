import { CronJob } from 'cron'

// 存储所有cron任务的引用
const cronJobs: Map<string, CronJob> = new Map()

// API调用函数
async function callAPI(endpoint: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.API_SECRET}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log(`Cron job API call successful: ${endpoint}`, result.success)
    return result
  } catch (error) {
    console.error(`Cron job API call failed: ${endpoint}`, error)
    throw error
  }
}

// 初始化所有定时任务
export function initializeCronJobs() {
  console.log('Initializing internal cron jobs...')

  // 每5分钟收集数据
  const dataCollectionJob = new CronJob(
    '*/5 * * * *', // 每5分钟执行
    async () => {
      console.log('Running data collection cron job...')
      try {
        await callAPI('collect')
        console.log('Data collection completed successfully')
      } catch (error) {
        console.error('Data collection cron job failed:', error)
      }
    },
    null, // onComplete
    false, // start
    'Asia/Shanghai' // timeZone
  )

  // 每日0:05重置统计
  const dailyResetJob = new CronJob(
    '5 0 * * *', // 每日0:05执行
    async () => {
      console.log('Running daily reset cron job...')
      try {
        await callAPI('daily-reset')
        console.log('Daily reset completed successfully')
      } catch (error) {
        console.error('Daily reset cron job failed:', error)
      }
    },
    null, // onComplete
    false, // start
    'Asia/Shanghai' // timeZone
  )

  // 每日12:00检查通知
  const notificationCheckJob = new CronJob(
    '0 12 * * *', // 每日12:00执行
    async () => {
      console.log('Running notification check cron job...')
      try {
        await callAPI('notify')
        console.log('Notification check completed successfully')
      } catch (error) {
        console.error('Notification check cron job failed:', error)
      }
    },
    null, // onComplete
    false, // start
    'Asia/Shanghai' // timeZone
  )

  // 存储任务引用
  cronJobs.set('dataCollection', dataCollectionJob)
  cronJobs.set('dailyReset', dailyResetJob)
  cronJobs.set('notificationCheck', notificationCheckJob)

  console.log('Internal cron jobs initialized')
}

// 启动所有定时任务
export function startCronJobs() {
  console.log('Starting internal cron jobs...')
  
  cronJobs.forEach((job, name) => {
    job.start()
    console.log(`Started cron job: ${name}`)
  })

  console.log(`Started ${cronJobs.size} internal cron jobs`)
}

// 停止所有定时任务
export function stopCronJobs() {
  console.log('Stopping internal cron jobs...')
  
  cronJobs.forEach((job, name) => {
    job.stop()
    console.log(`Stopped cron job: ${name}`)
  })

  console.log(`Stopped ${cronJobs.size} internal cron jobs`)
}

// 获取所有任务状态
export function getCronJobsStatus() {
  const status: Record<string, { running: boolean, cronTime: string }> = {}
  
  cronJobs.forEach((job, name) => {
    status[name] = {
      running: job.running,
      cronTime: job.cronTime.source
    }
  })

  return status
}

// 导出任务管理器
export const cronManager = {
  initialize: initializeCronJobs,
  start: startCronJobs,
  stop: stopCronJobs,
  status: getCronJobsStatus
}