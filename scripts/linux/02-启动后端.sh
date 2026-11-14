#!/usr/bin/env bash
# 《观文阁》Linux 启动后端服务 (127.0.0.1:3000)
# 用法: bash 02-启动后端.sh
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ ! -d "$ROOT/server/node_modules" ]; then
    echo "[错误] 后端依赖未安装，请先执行「01-安装依赖.sh」"
    exit 1
fi

echo "启动后端服务: http://127.0.0.1:3000  (Ctrl+C 停止)"
cd "$ROOT/server"
exec node server.js
