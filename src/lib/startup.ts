import { cronManager } from './cron'

// 应用启动时的初始化函数
export function initializeApplication() {
  console.log('Initializing YesCode Monitor application...')
  
  try {
    // 初始化并启动定时任务
    cronManager.initialize()
    cronManager.start()
    
    console.log('YesCode Monitor application initialized successfully')
  } catch (error) {
    console.error('Failed to initialize application:', error)
    // 不抛出错误，让应用继续启动，只是没有定时任务
  }
}

// 应用关闭时的清理函数
export function cleanupApplication() {
  console.log('Cleaning up YesCode Monitor application...')
  
  try {
    // 停止所有定时任务
    cronManager.stop()
    
    console.log('YesCode Monitor application cleanup completed')
  } catch (error) {
    console.error('Failed to cleanup application:', error)
  }
}

// 优雅关闭处理
function setupGracefulShutdown() {
  const shutdownHandler = () => {
    console.log('Received shutdown signal, cleaning up...')
    cleanupApplication()
    process.exit(0)
  }

  process.on('SIGTERM', shutdownHandler)
  process.on('SIGINT', shutdownHandler)
}

// 设置优雅关闭
setupGracefulShutdown()