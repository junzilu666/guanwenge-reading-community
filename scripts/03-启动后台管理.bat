@echo off
chcp 936 >nul
title 《观文阁》后台管理系统 localhost:5174
echo ==========================================
echo   《观文阁》后台管理系统启动中 ...
echo   访问地址: http://localhost:5174
echo   默认账号: admin    默认密码: admin
echo   请保持本窗口开启，不要关闭
echo ==========================================
echo.
cd /d "%~dp0..\admin"
if not exist node_modules (
    echo [提示] 尚未安装依赖，请先运行「01-安装依赖.bat」
    pause
    exit /b 1
)
call npm run dev
echo.
echo 后台管理系统已退出。按任意键关闭窗口。
pause
