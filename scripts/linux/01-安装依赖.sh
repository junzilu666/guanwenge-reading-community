#!/usr/bin/env bash
# 《观文阁》Linux 一键安装依赖（server / admin / web 三端）
# 用法: bash 01-安装依赖.sh
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NPM_CACHE="$ROOT/.npm-cache"

echo "=========================================="
echo "      《观文阁》一键安装依赖 (Linux)"
echo "=========================================="
echo

echo "[1/3] 安装后端依赖 (server) ..."
cd "$ROOT/server"
npm install --no-audit --no-fund --cache "$NPM_CACHE"
echo "[成功] 后端依赖安装完成"
echo

echo "[2/3] 安装后台管理系统依赖 (admin) ..."
cd "$ROOT/admin"
npm install --no-audit --no-fund --cache "$NPM_CACHE"
echo "[成功] 后台依赖安装完成"
echo

echo "[3/3] 安装用户前端依赖 (web) ..."
cd "$ROOT/web"
npm install --no-audit --no-fund --cache "$NPM_CACHE"
echo "[成功] 用户前端依赖安装完成"
echo

echo "全部依赖安装完成，可执行「05-一键启动全部.sh」启动项目"
