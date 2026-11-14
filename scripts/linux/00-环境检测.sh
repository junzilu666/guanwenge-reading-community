#!/usr/bin/env bash
# 《观文阁》Linux 环境检测
# 用法: bash 00-环境检测.sh   (或 chmod +x 后 ./00-环境检测.sh)
set -u

echo "=========================================="
echo "          《观文阁》Linux 环境检测"
echo "=========================================="
echo

fail=0

if ! command -v node >/dev/null 2>&1; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js 18 或更高版本！"
    echo "  Debian/Ubuntu : curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "  或使用 nvm    : curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash && nvm install 20"
    fail=1
else
    echo "[成功] Node.js 版本: $(node -v)"
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "[错误] 未检测到 npm，请重新安装 Node.js！"
    fail=1
else
    echo "[成功] npm 版本: $(npm -v)"
fi

echo
if [ "$fail" -ne 0 ]; then
    echo "[结论] 环境不满足，请按上面提示安装后重试"
    exit 1
fi
echo "[结论] 环境就绪，可以执行「01-安装依赖.sh」了"
