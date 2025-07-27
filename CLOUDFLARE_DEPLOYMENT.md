# Cloudflare Workers 定时任务部署指南

## 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

## 2. 登录 Cloudflare

```bash
wrangler auth login
```

## 3. 配置环境变量

在 Cloudflare Dashboard 中设置以下环境变量，或使用命令行：

```bash
# 设置应用程序 URL
wrangler secret put APP_URL
# 输入: https://your-domain.com

# 设置 API 密钥
wrangler secret put API_SECRET
# 输入: your-api-secret

# 设置 Bark 通知 URL
wrangler secret put BARK_URL
# 输入: https://api.day.app/your-bark-key
```

## 4. 部署 Worker

```bash
wrangler deploy
```

## 5. 定时任务说明

### 自动执行的定时任务：
- **每5分钟**: 收集 YesCode 使用数据
- **每日0点**: 执行每日重置和发送昨日汇总
- **每小时**: 检查通知阈值 (可选)

### 手动触发 API：
可以通过 HTTP 请求手动触发任务：

```bash
# 手动收集数据
curl -X POST https://yescode-monitor-cron.your-username.workers.dev/collect \
  -H "Authorization: Bearer your-api-secret"

# 手动每日重置
curl -X POST https://yescode-monitor-cron.your-username.workers.dev/daily-reset \
  -H "Authorization: Bearer your-api-secret"

# 手动检查通知
curl -X POST https://yescode-monitor-cron.your-username.workers.dev/notify \
  -H "Authorization: Bearer your-api-secret"
```

## 6. 监控和日志

在 Cloudflare Dashboard 的 Workers 部分可以查看：
- 执行日志
- 错误信息
- 性能指标

## 7. 自定义定时任务

如需修改定时任务频率，编辑 `wrangler.toml` 中的 `crons` 配置：

```toml
[triggers]
crons = [
  "*/5 * * * *",  # 每5分钟
  "*/10 * * * *", # 改为每10分钟
  "0 0 * * *",    # 每日0点
  "0 */6 * * *"   # 每6小时 (替代每小时)
]
```

## 8. 费用说明

Cloudflare Workers 免费套餐包含：
- 每日 100,000 次请求
- 每次执行最多 10ms CPU 时间

定时任务执行频率：
- 每5分钟: 每日 288 次
- 每日重置: 每日 1 次
- 每小时检查: 每日 24 次

**总计**: 每日约 313 次请求，完全在免费额度内。