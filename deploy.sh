#!/bin/bash
set -e

echo "🚀 YesCode Monitor Docker 部署脚本"
echo "==================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    print_status "检查部署依赖..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose 未安装，请先安装 docker-compose"
        exit 1
    fi
    
    print_success "依赖检查通过"
}

# 检查端口
check_ports() {
    print_status "检查端口占用情况..."
    
    if netstat -tuln 2>/dev/null | grep -q ':13000 ' || ss -tuln 2>/dev/null | grep -q ':13000 '; then
        print_error "端口 13000 已被占用"
        exit 1
    fi
    
    if netstat -tuln 2>/dev/null | grep -q ':15432 ' || ss -tuln 2>/dev/null | grep -q ':15432 '; then
        print_error "端口 15432 已被占用"  
        exit 1
    fi
    
    print_success "端口检查通过"
}

# 准备环境
prepare_environment() {
    print_status "准备部署环境..."
    
    # 创建必要目录
    mkdir -p data/postgres logs/app scripts config
    
    # 设置脚本权限
    chmod +x scripts/*.sh 2>/dev/null || true
    
    # 运行数据库备份预处理脚本
    if [ -f "scripts/prepare-database-backup-v3.sh" ]; then
        print_status "预处理数据库备份文件(PostgreSQL 17兼容)..."
        if bash scripts/prepare-database-backup-v3.sh; then
            print_success "数据库备份预处理完成"
        else
            print_error "数据库备份预处理失败"
            exit 1
        fi
    elif [ -f "scripts/prepare-database-backup-v2.sh" ]; then
        print_status "预处理数据库备份文件(支持PGDMP格式)..."
        if bash scripts/prepare-database-backup-v2.sh; then
            print_success "数据库备份预处理完成"
        else
            print_error "数据库备份预处理失败"
            exit 1
        fi
    elif [ -f "scripts/prepare-database-backup.sh" ]; then
        print_status "预处理数据库备份文件(旧版本)..."
        if bash scripts/prepare-database-backup.sh; then
            print_success "数据库备份预处理完成"
        else
            print_error "数据库备份预处理失败"
            exit 1
        fi
    else
        # 原有的备份处理逻辑（作为备用方案）
        if [ -f "db_yescode-monitor_20250910023000m8r6y.sql.gz" ]; then
            print_status "发现数据库备份文件，正在解压..."
            gunzip -c db_yescode-monitor_20250910023000m8r6y.sql.gz > scripts/init-data.sql
            print_success "数据库备份已解压到 scripts/init-data.sql"
        else
            print_warning "未找到数据库备份文件，将创建空数据库"
            touch scripts/init-data.sql
        fi
    fi
    
    # 验证处理后的备份文件
    if [ -f "scripts/backup.pgdump" ]; then
        BACKUP_SIZE=$(du -h scripts/backup.pgdump | cut -f1)
        print_success "PGDMP备份文件准备完成，大小: $BACKUP_SIZE"
    elif [ -f "scripts/init-data.sql" ] && [ -s "scripts/init-data.sql" ]; then
        SQL_SIZE=$(wc -l < scripts/init-data.sql)
        print_success "SQL文件准备完成，包含 $SQL_SIZE 行"
    else
        print_warning "备份文件为空或不存在，将使用Prisma初始化数据库"
    fi
    
    print_success "环境准备完成"
}

# 配置环境变量
setup_environment() {
    print_status "配置环境变量..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.docker" ]; then
            cp .env.docker .env
            print_success "已复制 .env.docker 到 .env"
        else
            print_error ".env.docker 文件不存在"
            exit 1
        fi
    else
        print_warning ".env 文件已存在，跳过复制"
    fi
    
    # 检查必要的环境变量
    if ! grep -q "YESCODE_API_KEY=cr_" .env; then
        print_warning "请确保在 .env 文件中设置正确的 YESCODE_API_KEY"
    fi
    
    if ! grep -q "BARK_URL=https://api.day.app/" .env; then
        print_warning "请确保在 .env 文件中设置正确的 BARK_URL"
    fi
    
    print_success "环境变量配置完成"
}

# 构建和启动服务
deploy_services() {
    print_status "构建并启动服务..."
    
    # 停止现有服务
    docker-compose -f docker-compose.simplified.yml down 2>/dev/null || true
    
    # 构建镜像
    print_status "构建应用镜像..."
    docker-compose -f docker-compose.simplified.yml build --no-cache
    
    # 启动服务
    print_status "启动服务..."
    docker-compose -f docker-compose.simplified.yml up -d
    
    print_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    print_status "等待服务就绪..."
    
    # 等待数据库
    local db_ready=false
    local app_ready=false
    local max_wait=180  # 增加等待时间到3分钟
    local wait_count=0
    
    while [ $wait_count -lt $max_wait ]; do
        # 检查数据库
        if ! $db_ready; then
            if docker-compose -f docker-compose.simplified.yml exec -T yescode-postgres pg_isready -U yescode_admin -d yescode_monitor &>/dev/null; then
                print_success "数据库已就绪"
                db_ready=true
                
                # 显示数据库状态信息
                TABLE_COUNT=$(docker-compose -f docker-compose.simplified.yml exec -T yescode-postgres psql -U yescode_admin -d yescode_monitor -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d ' ' || echo "0")
                if [ "$TABLE_COUNT" -gt "0" ]; then
                    print_success "数据库包含 $TABLE_COUNT 个表"
                else
                    print_warning "数据库为空，等待应用初始化..."
                fi
            fi
        fi
        
        # 检查应用（只有在数据库就绪后才检查）
        if $db_ready && ! $app_ready; then
            # 先检查容器是否健康
            if docker-compose -f docker-compose.simplified.yml ps yescode-app | grep -q "Up.*healthy"; then
                # 再检查API端点
                if curl -s -f http://localhost:13000/api/dashboard &>/dev/null; then
                    print_success "应用已就绪"
                    app_ready=true
                    break
                fi
            fi
        fi
        
        # 每10秒显示一次进度
        if [ $((wait_count % 10)) -eq 0 ]; then
            print_status "等待服务就绪... (${wait_count}s/${max_wait}s)"
            if $db_ready; then
                echo "  ✅ 数据库: 就绪"
            else
                echo "  ⏳ 数据库: 等待中"
            fi
            echo "  $(if $app_ready; then echo '✅'; else echo '⏳'; fi) 应用: $(if $app_ready; then echo '就绪'; else echo '等待中'; fi)"
        fi
        
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    if ! $app_ready; then
        print_error "服务启动超时，请检查日志"
        print_status "显示最近的应用日志:"
        docker-compose -f docker-compose.simplified.yml logs --tail=30 yescode-app
        print_status "显示最近的数据库日志:"
        docker-compose -f docker-compose.simplified.yml logs --tail=20 yescode-postgres
        exit 1
    fi
}

# 验证部署
verify_deployment() {
    print_status "验证部署结果..."
    
    # 检查容器状态
    local containers_up=$(docker-compose -f docker-compose.simplified.yml ps -q | wc -l)
    if [ "$containers_up" -ne 2 ]; then
        print_error "容器启动异常"
        docker-compose -f docker-compose.simplified.yml ps
        exit 1
    fi
    
    # 检查应用响应
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:13000/api/dashboard)
    if [ "$response" != "200" ]; then
        print_error "应用响应异常 (HTTP $response)"
        exit 1
    fi
    
    # 检查数据库
    if ! docker-compose -f docker-compose.simplified.yml exec -T yescode-postgres psql -U yescode_admin -d yescode_monitor -c "\dt" &>/dev/null; then
        print_error "数据库连接异常"
        exit 1
    fi
    
    print_success "部署验证通过"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "🎉 部署完成！"
    echo "=================================="
    echo "📱 应用访问地址: http://$(hostname -I | awk '{print $1}'):13000"
    echo "🗄️  数据库端口: 15432"
    echo "📋 容器状态:"
    docker-compose -f docker-compose.simplified.yml ps
    echo ""
    echo "📊 有用的命令:"
    echo "  查看日志: docker-compose -f docker-compose.simplified.yml logs -f"
    echo "  重启应用: docker-compose -f docker-compose.simplified.yml restart yescode-app"
    echo "  停止服务: docker-compose -f docker-compose.simplified.yml stop"
    echo "  查看状态: docker-compose -f docker-compose.simplified.yml ps"
    echo ""
    echo "📖 详细文档请查看: DOCKER_DEPLOY.md"
}

# 错误处理
cleanup_on_error() {
    print_error "部署失败，正在清理..."
    docker-compose -f docker-compose.simplified.yml down 2>/dev/null || true
    exit 1
}

trap cleanup_on_error ERR

# 主函数
main() {
    print_status "开始部署 YesCode Monitor..."
    
    check_dependencies
    check_ports
    prepare_environment
    setup_environment
    deploy_services
    wait_for_services
    verify_deployment
    show_deployment_info
    
    print_success "🎉 YesCode Monitor 部署成功！"
}

# 执行主函数
main "$@"