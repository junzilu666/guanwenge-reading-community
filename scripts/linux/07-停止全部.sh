#!/usr/bin/env bash
# 《观文阁》Linux 停止全部服务（后端 / 用户前端 / 后台管理）
# 用法: bash 07-停止全部.sh
set -u

echo "停止《观文阁》全部服务 ..."

# 停止后端
pkill -f "node server.js" 2>/dev/null && echo "[OK] 已停止后端 (3000)" || echo "[跳过] 后端未在运行"

# 停止两个 Vite dev server（按目录路径匹配，避免误杀其他 node 进程）
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
pkill -f "vite.*$ROOT/web" 2>/dev/null && echo "[OK] 已停止用户前端 (5173)" || echo "[跳过] 用户前端未在运行"
pkill -f "vite.*$ROOT/admin" 2>/dev/null && echo "[OK] 已停止后台管理 (5174)" || echo "[跳过] 后台管理未在运行"

# 兜底: 按端口再查一遍（适用于 pkill 未匹配到的场景）
for port in 3000 5173 5174; do
    pid=$(ss -ltnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1)
    if [ -n "$pid" ]; then
        kill "$pid" 2>/dev/null && echo "[OK] 已结束占用端口 $port 的进程 (PID $pid)"
    fi
done

sleep 1
echo
echo "完成。端口状态："
ss -ltn 2>/dev/null | grep -E ":(3000|5173|5174) " || echo "3000 / 5173 / 5174 均已释放"
