@echo off
chcp 936 >nul
title 《观文阁》后端服务 localhost:3000
echo ==========================================
echo    《观文阁》后端服务启动中 ...
echo   接口地址: http://localhost:3000
echo   请保持本窗口开启，不要关闭
echo ==========================================
echo.
cd /d "%~dp0..\server"
if not exist node_modules (
    echo [提示] 尚未安装依赖，请先运行「01-安装依赖.bat」
    pause
    exit /b 1
)
call node server.js
echo.
echo 后端服务已退出。按任意键关闭窗口。
pause
