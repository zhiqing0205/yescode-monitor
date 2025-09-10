# YesCode 监控系统

一个基于 Next.js 构建的 YesCode 使用量监控应用，提供实时跟踪、通知推送和数据分析功能。

## 功能特性

### 📊 实时监控
- 每 5 分钟自动采集数据
- 实时仪表盘显示使用统计
- 24 小时余额变化趋势图表

### 📈 监控面板
- **日使用量卡片**：显示当日消费情况和配额进度，动态状态指示器
- **月使用量卡片**：显示当月消费情况和预算进度，动态状态指示器
- **订阅状态卡片**：显示套餐剩余天数和到期时间，30天周期进度条
- **多维度图表视图**：
  - 今日余额变化趋势（实时折线图）
  - 昨日余额回顾（历史折线图） 
  - 近30天使用统计（柱状图）
- **实时倒计时**：显示下次数据更新的倒计时

### 🔔 智能通知推送 (Bark)
- API 请求失败告警
- 日使用量阈值提醒（50%、80%、95%）
- 每日使用量汇总报告
- 订阅到期前一天提醒（中午12点推送）
- 自动重置通知和系统状态

### 🎨 现代化界面
- 响应式设计，支持所有设备（1-2-4卡片布局）
- 深色模式切换，自动跟随系统主题
- 动态渐变背景效果和玻璃拟态风格
- 统一的蓝紫渐变色彩方案
- 实时状态指示器和进度条动画
- React.memo 优化，防止图表抖动
- GitHub 仓库链接集成

### ⚡ 自动化任务
- **5 分钟数据采集**：自动获取并存储使用数据
- **每日重置（东八区零点）**：重置通知标志并发送日报
- **API Key 认证**：使用稳定的 API Key 进行身份验证，无需频繁更新
- **订阅状态跟踪**：监控套餐到期时间并提前通知

## 技术栈

- **前端框架**: Next.js 15, React 19, TypeScript
- **样式设计**: Tailwind CSS, Lucide React 图标
- **数据库**: PostgreSQL + Prisma ORM
- **图表组件**: Recharts
- **主题管理**: next-themes
- **时区处理**: Luxon (东八区标准化)
- **部署平台**: Vercel + Cron Jobs
- **推送通知**: Bark API

## 数据库结构

### UsageRecord (使用记录)
存储每 5 分钟采集的完整 YesCode API 响应数据，使用 BIGINT 自增主键和 UTC 时间戳。

### DailyStats (日统计)
跟踪每日使用统计和通知状态，基于东八区时间计算。

### SystemLog (系统日志)
记录所有系统事件、错误和操作日志。

## 环境变量配置

参考 `.env.example` 创建 `.env` 文件：

```bash
DATABASE_URL="postgresql://username:password@host:port/database"
YESCODE_API_KEY="cr_your_api_key_here"
BARK_URL="https://api.day.app/your_device_key"
NEXT_PUBLIC_GITHUB_URL="https://github.com/yourusername/yescode-monitor"
API_SECRET="your_api_secret_for_cron_jobs"
```

## 快速开始

1. **安装依赖**：
   ```bash
   npm install
   ```

2. **配置数据库**：
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. **配置环境变量**：
   复制 `.env.example` 为 `.env` 并填入相应配置。

4. **启动开发服务器**：
   ```bash
   npm run dev
   ```

5. **部署到 Vercel**：
   项目包含 `vercel.json` 配置，自动设置定时任务。

## API 接口

- `POST /api/collect` - 获取并存储 YesCode 数据（定时任务触发）
- `POST /api/daily-reset` - 重置日统计并发送汇总（定时任务触发）
- `POST /api/notify` - 订阅到期通知检查（GitHub Actions 触发）
- `GET /api/dashboard` - 获取仪表盘数据（前端调用，包含今日、昨日和30天数据）
- `GET /api/init` - 初始化应用程序并启动内部定时任务
- `GET /api/cron` - 获取内部定时任务状态
- `POST /api/cron` - 控制内部定时任务（init/start/stop/restart）

## 定时任务

### 内部定时任务 (node-cron)
- **数据采集**：每 5 分钟执行 (`*/5 * * * *`)
- **日重置**：每日东八区0:05执行 (`5 0 * * *`)
- **通知检查**：每日东八区12:00执行 (`0 12 * * *`)

### 外部定时任务 (可选)
- **Vercel Cron Jobs**：备用数据采集方案
- **GitHub Actions**：备用到期提醒方案
- **Cloudflare Worker**：多重保障定时任务

## 部署说明

1. **数据库**：建议使用 Neon、Supabase 或 PlanetScale
2. **环境变量**：在 Vercel 控制台配置
3. **定时任务**：通过 `vercel.json` 自动配置
4. **时区处理**：所有时间操作基于东八区（Asia/Shanghai）

## 通知系统

应用会通过 Bark 发送以下通知：
- API 请求失败告警
- 月使用量阈值提醒（50%、80%、95%）
- 每日使用量汇总报告
- 订阅套餐到期前一天提醒（中午12点触发）
- 系统错误通知

通知格式：`标题 / 消息内容 / 分组:yescode`

### GitHub Actions 通知流程
1. 每日中午12点（东八区）自动触发
3. 检查订阅套餐是否在到期前一天
4. 通过 Bark API 推送到期提醒通知

## 开发指令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 运行数据库迁移
npx prisma migrate dev

# 重置数据库
npx prisma migrate reset

# 查看数据库
npx prisma studio

# 类型检查
npm run typecheck

# 代码检查
npm run lint
```

## 系统特色

### 时区处理
- 使用 Luxon 库统一处理时区
- 所有业务逻辑基于东八区时间
- 数据库存储 UTC 时间，查询时转换为东八区
- 无论部署在全球何处，都保持一致的时区体验

### 数据架构
- BIGINT 自增主键提升性能
- 完整的 BigInt 和 Decimal 序列化处理
- UTC 时间戳存储，业务层时区转换
- 备份恢复机制保障数据安全

### 用户体验
- 四卡片响应式布局（1-2-4 列自适应）
- 多维度图表切换（今日/昨日/30天）
- 实时数据更新倒计时显示
- 平滑曲线图表，东八区时间格式
- 统一的进度条和状态指示器
- 深色模式支持，字体抗锯齿优化
- React.memo 性能优化，防止图表抖动

## 许可证

MIT License - 详见 LICENSE 文件。

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目。请确保：
- 遵循现有代码风格
- 提交前运行 `npm run lint` 和 `npm run typecheck`
- 详细描述变更内容和原因