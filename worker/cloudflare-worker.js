// Cloudflare Worker for YesCode Monitor Cron Jobs
export default {
  async scheduled(event, env, ctx) {
    const { cron, scheduledTime } = event;
    
    console.log(`Cron job triggered: ${cron} at ${new Date(scheduledTime).toISOString()}`);
    
    try {
      // 每5分钟收集数据 (与 GitHub Actions 一致)
      if (cron === "*/5 * * * *") {
        await collectUsageData(env);
      }
      
      // 每日00:05重置 (与 GitHub Actions 一致，避免与0点冲突)
      if (cron === "5 0 * * *") {
        await dailyReset(env);
      }
      
      // 每日04:00通知检查 (UTC时间，对应中午12:00 UTC+8，与 GitHub Actions 一致)
      if (cron === "0 4 * * *") {
        await checkNotifications(env);
      }
      
    } catch (error) {
      console.error(`Cron job failed:`, error);
      
      // 发送错误通知
      await sendErrorNotification(env, error);
    }
  },
  
  // 处理 HTTP 请求 (用于手动触发)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 验证 API 密钥
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ') || 
        authHeader.substring(7) !== env.API_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    try {
      switch (path) {
        case '/collect':
          await collectUsageData(env);
          return new Response('Data collection triggered', { status: 200 });
          
        case '/daily-reset':
          await dailyReset(env);
          return new Response('Daily reset triggered', { status: 200 });
          
        case '/notify':
          await checkNotifications(env);
          return new Response('Notification check triggered', { status: 200 });
          
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error(`Manual trigger failed:`, error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};

// 收集使用数据
async function collectUsageData(env) {
  console.log('Triggering data collection...');
  
  const response = await fetch(`${env.APP_URL}/api/collect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.API_SECRET}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Collect API failed: ${response.status} ${await response.text()}`);
  }
  
  const result = await response.json();
  console.log('Data collection successful:', result.success);
  
  return result;
}

// 每日重置
async function dailyReset(env) {
  console.log('Triggering daily reset...');
  
  const response = await fetch(`${env.APP_URL}/api/daily-reset`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.API_SECRET}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Daily reset API failed: ${response.status} ${await response.text()}`);
  }
  
  const result = await response.json();
  console.log('Daily reset successful:', result.success);
  
  return result;
}

// 检查通知
async function checkNotifications(env) {
  console.log('Checking notifications...');
  
  const response = await fetch(`${env.APP_URL}/api/notify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.API_SECRET}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Notify API failed: ${response.status} ${await response.text()}`);
  }
  
  const result = await response.json();
  console.log('Notification check successful:', result.success);
  
  return result;
}

// 发送错误通知
async function sendErrorNotification(env, error) {
  if (!env.BARK_URL) return;
  
  try {
    const title = 'YesCode Monitor Cron Error';
    const body = `Cloudflare Worker cron job failed: ${error.message}`;
    
    const url = new URL(env.BARK_URL);
    url.pathname += `/${encodeURIComponent(title)}/${encodeURIComponent(body)}`;
    url.searchParams.append('group', 'yescode-error');
    
    await fetch(url.toString(), { method: 'POST' });
  } catch (notificationError) {
    console.error('Failed to send error notification:', notificationError);
  }
}