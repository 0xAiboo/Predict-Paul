#!/bin/bash

# 反向代理测试脚本

echo "🔍 测试反向代理配置..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试本地开发环境（需要先启动 npm run dev）
test_local() {
    echo "${YELLOW}📍 测试本地开发环境...${NC}"
    echo "请确保已运行: npm run dev"
    echo ""
    
    # 测试事件 API
    echo "测试: GET http://localhost:3000/api/event"
    response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/event 2>&1)
    http_code=$(echo "$response" | tail -n 1)
    
    if [ "$http_code" = "200" ]; then
        echo "${GREEN}✅ 事件 API 工作正常${NC}"
    else
        echo "${RED}❌ 事件 API 失败 (HTTP $http_code)${NC}"
    fi
    echo ""
    
    # 测试历史 API
    echo "测试: GET http://localhost:3000/api/history"
    response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/history 2>&1)
    http_code=$(echo "$response" | tail -n 1)
    
    if [ "$http_code" = "200" ]; then
        echo "${GREEN}✅ 历史 API 工作正常${NC}"
    else
        echo "${RED}❌ 历史 API 失败 (HTTP $http_code)${NC}"
    fi
    echo ""
}

# 测试后端直接连接
test_backend() {
    echo "${YELLOW}📍 测试后端服务器直接连接...${NC}"
    echo ""
    
    echo "测试: GET http://51.79.173.45:8000/event"
    response=$(curl -s -w "\n%{http_code}" http://51.79.173.45:8000/event 2>&1)
    http_code=$(echo "$response" | tail -n 1)
    
    if [ "$http_code" = "200" ]; then
        echo "${GREEN}✅ 后端服务器正常运行${NC}"
    else
        echo "${RED}❌ 后端服务器无响应 (HTTP $http_code)${NC}"
    fi
    echo ""
}

# 显示配置信息
show_config() {
    echo "${YELLOW}📋 当前配置:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "后端服务器: http://51.79.173.45:8000"
    echo "本地开发: http://localhost:3000"
    echo "代理路径: /api/* → http://51.79.173.45:8000/*"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# 主菜单
main() {
    clear
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   反向代理测试工具"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    show_config
    
    echo "请选择测试选项:"
    echo "1) 测试本地开发环境 (localhost:3000)"
    echo "2) 测试后端服务器直接连接"
    echo "3) 运行所有测试"
    echo "4) 退出"
    echo ""
    read -p "输入选项 [1-4]: " choice
    
    case $choice in
        1)
            echo ""
            test_local
            ;;
        2)
            echo ""
            test_backend
            ;;
        3)
            echo ""
            test_backend
            test_local
            ;;
        4)
            echo "退出..."
            exit 0
            ;;
        *)
            echo "${RED}无效选项${NC}"
            ;;
    esac
    
    echo ""
    read -p "按 Enter 继续..." 
    main
}

# 运行主程序
main

