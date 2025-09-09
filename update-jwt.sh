#!/bin/bash

# YesCode JWT Token 更新脚本
# 用法: ./update-jwt.sh

set -e

ENV_FILE="/root/dev/yescode-monitor/.env"
CONTAINER_NAME="YesCode-Monitor"

echo "🔧 YesCode JWT Token 更新工具"
echo "================================"

# 检查 .env 文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 错误: .env 文件不存在: $ENV_FILE"
    exit 1
fi

echo "📋 当前 JWT Token 信息:"
grep "YESCODE_JWT_TOKEN" "$ENV_FILE" | sed 's/YESCODE_JWT_TOKEN=".*"/YESCODE_JWT_TOKEN="[已隐藏]"/' || echo "未找到 YESCODE_JWT_TOKEN"

echo ""
echo "🔑 请输入新的 JWT Token (按回车确认):"
read -r NEW_JWT_TOKEN

# 如果输入为空，跳过JWT更新
if [ -z "$NEW_JWT_TOKEN" ]; then
    echo "⏭️  跳过 JWT Token 更新，直接重启容器..."
else
    # 验证 JWT Token 格式 (基本检查)
    if [[ ! "$NEW_JWT_TOKEN" =~ ^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$ ]]; then
        echo "⚠️  警告: 输入的内容不像是有效的 JWT Token 格式"
        echo "是否继续? (y/N): "
        read -r CONFIRM
        if [[ ! "$CONFIRM" =~ ^[yY]$ ]]; then
            echo "❌ 操作已取消"
            exit 1
        fi
    fi

    echo ""
    echo "🔄 正在更新 JWT Token..."

    # 备份原始文件
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ 已创建备份文件"

    # 更新 JWT Token
    if grep -q "YESCODE_JWT_TOKEN=" "$ENV_FILE"; then
        # 替换现有的 JWT Token
        sed -i "s/YESCODE_JWT_TOKEN=.*/YESCODE_JWT_TOKEN=\"$NEW_JWT_TOKEN\"/" "$ENV_FILE"
        echo "✅ JWT Token 已更新"
    else
        # 添加新的 JWT Token
        echo "YESCODE_JWT_TOKEN=\"$NEW_JWT_TOKEN\"" >> "$ENV_FILE"
        echo "✅ JWT Token 已添加"
    fi
fi

echo ""
echo "🐳 检查 Docker 容器状态..."

# 检查容器是否存在并运行
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$CONTAINER_NAME"; then
    echo "📦 找到运行中的容器: $CONTAINER_NAME"
    echo "🔄 重启容器..."
    docker restart "$CONTAINER_NAME"
    echo "✅ 容器已重启"
elif docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep -q "$CONTAINER_NAME"; then
    echo "📦 找到停止的容器: $CONTAINER_NAME"
    echo "🚀 启动容器..."
    docker start "$CONTAINER_NAME"
    echo "✅ 容器已启动"
else
    echo "⚠️  未找到名为 '$CONTAINER_NAME' 的 Docker 容器"
    echo "📋 当前运行的容器:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    echo ""
    echo "请手动重启相关的 YesCode 容器，或者如果使用 docker-compose:"
    echo "cd /root/dev/yescode-monitor && docker-compose restart"
fi

echo ""
echo "🎉 JWT Token 更新完成!"
echo "📝 新的配置已生效，请检查应用日志确认连接正常。"