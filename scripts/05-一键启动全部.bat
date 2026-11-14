@echo off
chcp 65001 >nul
title 《观文阁》一键启动全部服务
echo ==========================================
echo     《观文阁》一键启动全部服务
echo  启动顺序：后端(3000) → 后台(5174) → 前端(5173)
echo  每个服务在独立的窗口中运行，不要关闭
echo ==========================================
echo.
if not exist "%~dp0..\server\node_modules" (
    echo [提示] 尚未安装依赖，请先运行「01-安装依赖.bat」
    pause
    exit /b 1
)
rem 端口预检：已在运行的服务自动跳过，避免重复启动与端口冲突
netstat -ano 2>nul | findstr ":3000" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [1/3] 启动后端服务 ...
    start "观文阁-后端-3000" cmd /k "cd /d %~dp0..\server && node server.js"
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] 后端 3000 已在运行，跳过重复启动
)
netstat -ano 2>nul | findstr ":5174" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [2/3] 启动后台管理系统 ...
    start "观文阁-后台-5174" cmd /k "cd /d %~dp0..\admin && npm run dev"
    timeout /t 3 /nobreak >nul
) else (
    echo [2/3] 后台管理 5174 已在运行，跳过重复启动
)
netstat -ano 2>nul | findstr ":5173" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [3/3] 启动用户前端 ...
    start "观文阁-前端-5173" cmd /k "cd /d %~dp0..\web && npm run dev"
) else (
    echo [3/3] 用户前端 5173 已在运行，跳过重复启动
)
echo.
echo 全部服务已在独立窗口中启动，请等待约 5-10 秒完成初始化。
echo.
echo   前端地址（阅读、注册、登录）: http://localhost:5173
echo       演示账号 demo / 密码 123456
echo.
echo   后端地址（接口服务，直接打开会显示提示）: http://localhost:3000
echo       健康检查: http://localhost:3000/api/health
echo.
echo   后台地址（管理员后台）: http://localhost:5174
echo       管理员账号 admin / 密码 admin
echo.
echo 提示：三个服务仅监听本机 127.0.0.1，关闭窗口即停止对应服务。
echo.
pause
