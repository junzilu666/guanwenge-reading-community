#!/usr/bin/env bash
# 《观文阁》Linux 启动用户前端 (127.0.0.1:5173)
# 用法: bash 04-启动用户前端.sh
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ ! -d "$ROOT/web/node_modules" ]; then
    echo "[错误] 用户前端依赖未安装，请先执行「01-安装依赖.sh」"
    exit 1
fi

echo "启动用户前端: http://127.0.0.1:5173  (演示账号 demo / 密码 123456，Ctrl+C 停止)"
cd "$ROOT/web"
exec npm run dev
