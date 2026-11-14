@echo off
chcp 65001 >nul
title 《观文阁》用户前端 localhost:5173
echo ==========================================
echo   《观文阁》用户前端启动中 ...
echo   访问地址: http://localhost:5173
echo   默认账号: demo    默认密码: 123456
echo   请保持本窗口开启，不要关闭
echo ==========================================
echo.
cd /d "%~dp0..\web"
if not exist node_modules (
    echo [提示] 尚未安装依赖，请先运行「01-安装依赖.bat」
    pause
    exit /b 1
)
call npm run dev
echo.
echo 用户前端已退出。按任意键关闭窗口。
pause
