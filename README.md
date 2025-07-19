# PackyCode Monitor

A Next.js application for monitoring PackyCode usage with real-time tracking, notifications, and analytics.

## Features

### 📊 Real-time Monitoring
- 5-minute interval data collection
- Live dashboard with usage statistics
- 24-hour balance tracking with interactive charts

### 📈 Dashboard
- **Daily Usage Card**: Shows current day spending with progress bar
- **Monthly Usage Card**: Displays monthly consumption against budget
- **Subscription Card**: Days remaining until plan expiration
- **Interactive Line Chart**: 24-hour balance tracking with hover details

### 🔔 Smart Notifications (Bark)
- Request failure alerts
- Daily usage threshold alerts (50%, 80%, 95%)
- Daily summary reports
- Automatic daily reset notifications

### 🎨 Modern UI
- Responsive design for all devices
- Dark mode toggle with system preference detection
- Animated gradient background
- Glass morphism effects
- GitHub repository link

### ⚡ Automated Tasks
- **5-minute data collection**: Fetches and stores usage data
- **Daily reset at midnight (UTC+8)**: Resets notification flags and sends daily summary

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Lucide React icons
- **Database**: PostgreSQL with Prisma ORM
- **Charts**: Recharts
- **Themes**: next-themes
- **Deployment**: Vercel with Cron Jobs
- **Notifications**: Bark API

## Database Schema

### UsageRecord
Stores every 5-minute data collection with complete PackyCode API response.

### DailyStats
Tracks daily usage statistics and notification states.

### SystemLog
Logs all system events, errors, and operations.

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
DATABASE_URL="postgresql://username:password@host:port/database"
PACKYCODE_JWT_TOKEN="your_jwt_token_here"
BARK_URL="https://api.day.app/your_device_key"
NEXT_PUBLIC_GITHUB_URL="https://github.com/yourusername/packycode-monitor"
```

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up database**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your values.

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Deploy to Vercel**:
   The project includes `vercel.json` for automatic cron job setup.

## API Endpoints

- `GET /api/collect` - Fetch and store PackyCode data (triggered by cron)
- `GET /api/daily-reset` - Reset daily stats and send summary (triggered by cron)
- `GET /api/dashboard` - Get dashboard data for frontend

## Cron Jobs (Vercel)

- **Data Collection**: Every 5 minutes (`*/5 * * * *`)
- **Daily Reset**: Daily at midnight UTC+8 (`0 16 * * *`)

## Deployment Notes

1. **Database**: Set up PostgreSQL database (recommended: Neon, Supabase, or PlanetScale)
2. **Environment Variables**: Configure in Vercel dashboard
3. **Cron Jobs**: Automatically configured via `vercel.json`

## Notification System

The app sends Bark notifications for:
- API request failures
- Daily usage thresholds (50%, 80%, 95%)
- Daily usage summaries
- System errors

Notification format: `Title / Message / Group:packycode`

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

## License

MIT License - see LICENSE file for details.
