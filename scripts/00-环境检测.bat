@echo off
chcp 936 >nul
title 《观文阁》环境检测
echo ==========================================
echo           《观文阁》环境检测
echo ==========================================
echo.
node -v >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18 或更高版本！
    echo 下载地址: https://nodejs.org/zh-cn/download
    pause
    exit /b 1
)
npm -v >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 npm，请重新安装 Node.js！
    pause
    exit /b 1
)
echo [成功] Node.js 版本: 
node -v
echo [成功] npm 版本:
npm -v
echo.
echo [提示] 建议先执行「01-安装依赖.bat」安装项目依赖
echo.
pause
