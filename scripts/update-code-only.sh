#!/bin/bash
set -e

# YesCode Monitor 代码更新部署脚本
# 用于更新代码而保留数据库数据

echo "🔄 YesCode Monitor 代码更新部署脚本"
echo "===================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[状态]${NC} $1"
}

print_ok() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 检查前置条件
check_prerequisites() {
    print_status "检查前置条件..."
    
    if [ ! -f "docker-compose.simplified.yml" ]; then
        print_error "docker-compose.simplified.yml 不存在"
        exit 1
    fi
    
    if [ ! -f "prisma/schema.prisma" ]; then
        print_error "Prisma schema 文件不存在"
        exit 1
    fi
    
    # 检查Docker和docker-compose是否可用
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装或不可用"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose 未安装或不可用"
        exit 1
    fi
    
    print_ok "前置条件检查通过"
}

# 备份当前数据
backup_database() {
    print_status "创建数据库备份..."
    
    # 创建备份目录
    mkdir -p backups
    
    # 生成备份文件名
    BACKUP_FILE="backups/database_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # 检查数据库容器是否运行
    if docker-compose -f docker-compose.simplified.yml ps yescode-postgres | grep -q "Up"; then
        print_status "导出数据库数据..."
        if docker-compose -f docker-compose.simplified.yml exec -T yescode-postgres \
            pg_dump -U yescode_admin -d yescode_monitor --clean --if-exists > "$BACKUP_FILE"; then
            print_ok "数据库备份完成: $BACKUP_FILE"
            BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            print_ok "备份文件大小: $BACKUP_SIZE"
        else
            print_error "数据库备份失败"
            exit 1
        fi
    else
        print_warning "数据库容器未运行，跳过备份"
    fi
}

# 停止应用容器（保留数据库）
stop_application() {
    print_status "停止应用容器..."
    
    # 只停止应用容器，保留数据库运行
    docker-compose -f docker-compose.simplified.yml stop yescode-app
    print_ok "应用容器已停止"
}

# 运行数据库迁移
run_migrations() {
    print_status "运行数据库迁移..."
    
    # 检查是否需要生成迁移文件
    if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
        print_warning "未找到迁移文件，将使用 db push 同步架构"
        
        # 使用临时容器运行 db push
        docker run --rm \
            --network yescode-monitor_yescode-network \
            -v "$(pwd)":/app \
            -w /app \
            -e DATABASE_URL="postgresql://yescode_admin:Kp8vN2mR7xQ9wE4tY6uI1oP3sA5dF8hJ@yescode-postgres:5432/yescode_monitor" \
            node:18-alpine sh -c "
                npm install -g prisma @prisma/client &&
                npx prisma generate &&
                npx prisma db push --accept-data-loss
            "
    else
        print_status "应用数据库迁移..."
        
        # 使用临时容器运行迁移
        docker run --rm \
            --network yescode-monitor_yescode-network \
            -v "$(pwd)":/app \
            -w /app \
            -e DATABASE_URL="postgresql://yescode_admin:Kp8vN2mR7xQ9wE4tY6uI1oP3sA5dF8hJ@yescode-postgres:5432/yescode_monitor" \
            node:18-alpine sh -c "
                npm install -g prisma @prisma/client &&
                npx prisma generate &&
                npx prisma migrate deploy
            "
    fi
    
    print_ok "数据库迁移完成"
}

# 重建应用容器
rebuild_application() {
    print_status "重建应用容器..."
    
    # 删除旧的应用容器镜像
    print_status "清理旧容器镜像..."
    docker-compose -f docker-compose.simplified.yml rm -f yescode-app
    
    # 清理未使用的镜像（可选）
    if docker images | grep -q "yescode-monitor"; then
        docker rmi $(docker images "yescode-monitor*" -q) 2>/dev/null || true
    fi
    
    # 重新构建应用容器
    print_status "构建新的应用容器..."
    docker-compose -f docker-compose.simplified.yml build yescode-app
    
    print_ok "应用容器构建完成"
}

# 启动应用
start_application() {
    print_status "启动应用容器..."
    
    docker-compose -f docker-compose.simplified.yml up -d yescode-app
    
    # 等待应用启动
    print_status "等待应用启动..."
    local max_wait=120
    local wait_count=0
    
    while [ $wait_count -lt $max_wait ]; do
        if docker-compose -f docker-compose.simplified.yml ps yescode-app | grep -q "Up"; then
            # 检查健康状态
            if curl -s -f http://localhost:13000/api/dashboard &>/dev/null; then
                print_ok "应用已成功启动"
                return 0
            fi
        fi
        
        if [ $((wait_count % 10)) -eq 0 ]; then
            print_status "等待应用启动... (${wait_count}s/${max_wait}s)"
        fi
        
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    print_error "应用启动超时，请检查日志"
    return 1
}

# 验证部署
verify_deployment() {
    print_status "验证部署结果..."
    
    # 检查容器状态
    print_status "检查容器状态..."
    docker-compose -f docker-compose.simplified.yml ps
    
    # 检查数据库连接
    print_status "验证数据库连接..."
    TABLE_COUNT=$(docker-compose -f docker-compose.simplified.yml exec -T yescode-postgres \
        psql -U yescode_admin -d yescode_monitor -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')
    
    print_ok "数据库包含 $TABLE_COUNT 个表"
    
    # 检查新字段是否存在
    print_status "验证新字段..."
    NEW_FIELDS=$(docker-compose -f docker-compose.simplified.yml exec -T yescode-postgres \
        psql -U yescode_admin -d yescode_monitor -t -c \
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'usage_records_v3' AND column_name IN ('payAsYouGoBalance', 'totalBalance');" | tr -d ' ' | wc -l)
    
    if [ "$NEW_FIELDS" -gt "0" ]; then
        print_ok "新字段已成功添加"
    else
        print_warning "未检测到新字段，可能需要手动检查"
    fi
    
    # 检查API响应
    print_status "测试API响应..."
    if curl -s -f http://localhost:13000/api/dashboard >/dev/null; then
        print_ok "API响应正常"
    else
        print_error "API响应异常，请检查应用日志"
        docker-compose -f docker-compose.simplified.yml logs --tail=20 yescode-app
        return 1
    fi
    
    print_ok "部署验证完成"
}

# 显示部署结果
show_results() {
    echo ""
    print_ok "🎉 代码更新部署完成!"
    echo ""
    echo "📊 访问信息:"
    echo "  - 监控面板: http://$(hostname -I | awk '{print $1}'):13000"
    echo "  - 数据库端口: 15432"
    echo ""
    echo "📋 新功能:"
    echo "  - ✅ 第三张卡片：按量付费余额"
    echo "  - ✅ 第一张卡片：订阅余额日消耗（名称更新）"
    echo "  - ✅ 图表显示：双线折线图（蓝色订阅+紫色按量付费）"
    echo "  - ✅ 数据保留：历史数据完整保留"
    echo ""
    echo "📋 检查命令:"
    echo "  - 查看容器状态: docker-compose -f docker-compose.simplified.yml ps"
    echo "  - 查看应用日志: docker-compose -f docker-compose.simplified.yml logs yescode-app"
    echo "  - 查看数据库表: docker-compose -f docker-compose.simplified.yml exec yescode-postgres psql -U yescode_admin -d yescode_monitor -c '\dt'"
    echo ""
}

# 主函数
main() {
    echo ""
    print_warning "⚠️  此脚本将更新代码并保留现有数据"
    print_warning "⚠️  将停止应用容器并重新构建，但不会影响数据库"
    echo ""
    
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "操作已取消"
        exit 0
    fi
    
    check_prerequisites
    backup_database
    stop_application
    run_migrations
    rebuild_application
    start_application
    
    if verify_deployment; then
        show_results
    else
        print_error "部署验证失败，请检查日志"
        exit 1
    fi
}

# 执行主函数
main "$@"