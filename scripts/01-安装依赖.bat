@echo off
chcp 936 >nul
title 《观文阁》一键安装依赖
echo ==========================================
echo       《观文阁》一键安装依赖
echo ==========================================
echo.
echo [1/3] 安装后端依赖 (server) ...
cd /d "%~dp0..\server"
call npm install --no-audit --no-fund --cache "%~dp0..\.npm-cache"
if %errorlevel% neq 0 (
    echo [错误] 后端依赖安装失败，请检查网络后重试
    pause
    exit /b 1
)
echo [成功] 后端依赖安装完成
echo.
echo [2/3] 安装后台管理系统依赖 (admin) ...
cd /d "%~dp0..\admin"
call npm install --no-audit --no-fund --cache "%~dp0..\.npm-cache"
if %errorlevel% neq 0 (
    echo [错误] 后台依赖安装失败
    pause
    exit /b 1
)
echo [成功] 后台依赖安装完成
echo.
echo [3/3] 安装用户前端依赖 (web) ...
cd /d "%~dp0..\web"
call npm install --no-audit --no-fund --cache "%~dp0..\.npm-cache"
if %errorlevel% neq 0 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)
echo [成功] 前端依赖安装完成
echo.
echo ==========================================
echo 全部依赖安装完成！接下来请依次运行：
echo   02-启动后端.bat  →  03-启动后台管理.bat  →  04-启动用户前端.bat
echo ==========================================
pause
