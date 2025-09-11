#!/bin/sh
set -e

echo "🚀 Starting YesCode Monitor Application..."
echo "📅 Current time: $(date)"
echo "🏠 Working directory: $(pwd)"
echo "👤 Running as user: $(id)"

# 健康检查函数
wait_for_db() {
    echo "⏳ Waiting for database connection..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "🔍 Database connection attempt $attempt/$max_attempts"
        
        # 使用更简单的连接测试
        if node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$connect()
          .then(() => { 
            console.log('Database connected successfully');
            prisma.\$disconnect();
            process.exit(0);
          })
          .catch((e) => { 
            console.log('Database connection failed:', e.message);
            process.exit(1);
          });
        " 2>/dev/null; then
            echo "✅ Database connection successful!"
            return 0
        fi
        
        echo "⏱️  Database not ready, waiting 5 seconds..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo "❌ Failed to connect to database after $max_attempts attempts"
    exit 1
}

# 数据库迁移函数
setup_database() {
    echo "🗄️  Setting up database..."
    
    # 等待数据库连接
    wait_for_db
    
    # 生成 Prisma 客户端
    echo "🔧 Generating Prisma client..."
    npx prisma generate
    
    # 检查数据库是否已经有数据
    echo "🔍 Checking database state..."
    TABLE_COUNT=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    (async () => {
        try {
            const result = await prisma.\$queryRaw\`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            \`;
            console.log(result[0].count.toString());
            await prisma.\$disconnect();
        } catch (error) {
            console.log('0');
            await prisma.\$disconnect();
        }
    })();
    " 2>/dev/null || echo "0")
    
    if [ "$TABLE_COUNT" -gt "0" ]; then
        echo "✅ Database contains $TABLE_COUNT tables, skipping migration"
        echo "🔄 Verifying database schema compatibility..."
        
        # 检查重要表是否存在
        CORE_TABLES=$(node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        (async () => {
            try {
                const tables = await prisma.\$queryRaw\`
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('daily_stats_v3', 'usage_summaries')
                \`;
                console.log(tables.length);
                await prisma.\$disconnect();
            } catch (error) {
                console.log('0');
                await prisma.\$disconnect();
            }
        })();
        " 2>/dev/null || echo "0")
        
        if [ "$CORE_TABLES" -gt "0" ]; then
            echo "✅ Core tables found, database appears to be properly imported"
        else
            echo "⚠️  Core tables not found, but database is not empty"
            echo "🔄 Attempting to sync schema..."
            npx prisma db push --accept-data-loss || {
                echo "❌ Schema sync failed, but continuing..."
            }
        fi
    else
        echo "📝 Database is empty, running migrations..."
        # 尝试运行迁移，如果失败则推送架构
        if ! npx prisma migrate deploy 2>/dev/null; then
            echo "📝 No migrations found, pushing schema..."
            npx prisma db push --accept-data-loss
        fi
    fi
    
    echo "✅ Database setup completed!"
}

# 设置信号处理
trap_handler() {
    echo "🛑 Received shutdown signal, gracefully stopping..."
    if [ ! -z "$APP_PID" ]; then
        kill -TERM "$APP_PID"
        wait "$APP_PID"
    fi
    echo "👋 Application stopped gracefully"
    exit 0
}

trap trap_handler SIGTERM SIGINT

# 主启动流程
main() {
    echo "🔧 Initializing application..."
    
    # 设置数据库
    setup_database
    
    echo "🎯 Starting Node.js application..."
    
    # 启动应用并获取PID
    node server.js &
    APP_PID=$!
    
    echo "✅ YesCode Monitor started successfully!"
    echo "🆔 Process ID: $APP_PID"
    echo "🌐 Application available at: http://0.0.0.0:3000"
    echo "📊 Health check endpoint: http://0.0.0.0:3000/api/dashboard"
    
    # 等待应用进程
    wait $APP_PID
}

# 执行主函数
main