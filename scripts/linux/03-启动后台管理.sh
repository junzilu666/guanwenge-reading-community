#!/usr/bin/env bash
# 《观文阁》Linux 启动后台管理 (127.0.0.1:5174)
# 用法: bash 03-启动后台管理.sh
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ ! -d "$ROOT/admin/node_modules" ]; then
    echo "[错误] 后台管理依赖未安装，请先执行「01-安装依赖.sh」"
    exit 1
fi

echo "启动后台管理: http://127.0.0.1:5174  (账号 admin / 密码 admin，Ctrl+C 停止)"
cd "$ROOT/admin"
exec npm run dev
