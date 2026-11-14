#!/usr/bin/env bash
# 《观文阁》Linux 一键启动全部（后端 → 后台 → 前端）
# 用法: bash 05-一键启动全部.sh
# 三个服务都在后台运行，日志写入 scripts/linux/logs/；停止用 07-停止全部.sh
set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOGDIR="$(dirname "$0")/logs"
mkdir -p "$LOGDIR"

if [ ! -d "$ROOT/server/node_modules" ] || [ ! -d "$ROOT/web/node_modules" ] || [ ! -d "$ROOT/admin/node_modules" ]; then
    echo "[错误] 有依赖未安装，请先执行「01-安装依赖.sh」"
    exit 1
fi

# 已在运行则不重复启动
if pgrep -f "node server.js" >/dev/null 2>&1; then
    echo "[跳过] 后端已在运行"
else
    echo "[1/3] 启动后端服务 ..."
    (cd "$ROOT/server" && nohup node server.js > "$LOGDIR/server.log" 2>&1 &)
    sleep 2
fi

if pgrep -f "web.*vite\|vite.*web" >/dev/null 2>&1 || ss -ltn 2>/dev/null | grep -q ":5173 "; then
    echo "[跳过] 用户前端已在运行"
else
    echo "[2/3] 启动用户前端 ..."
    (cd "$ROOT/web" && nohup npm run dev > "$LOGDIR/web.log" 2>&1 &)
    sleep 3
fi

if pgrep -f "admin.*vite\|vite.*admin" >/dev/null 2>&1 || ss -ltn 2>/dev/null | grep -q ":5174 "; then
    echo "[跳过] 后台管理已在运行"
else
    echo "[3/3] 启动后台管理系统 ..."
    (cd "$ROOT/admin" && nohup npm run dev > "$LOGDIR/admin.log" 2>&1 &)
    sleep 3
fi

echo
echo "全部服务已后台启动（等待约 5-10 秒完成初始化）："
echo
echo "  前端网址（看文章、注册登录）: http://127.0.0.1:5173"
echo "      演示账号 demo / 密码 123456"
echo
echo "  后端网址（接口服务）: http://127.0.0.1:3000"
echo "      健康检查: http://127.0.0.1:3000/api/health"
echo
echo "  管理网址（管理员后台）: http://127.0.0.1:5174"
echo "      管理员账号 admin / 密码 admin"
echo
echo "日志位置: $LOGDIR/  (server.log / web.log / admin.log)"
echo "停止服务: bash 07-停止全部.sh"
echo
