@echo off
REM WeaveNet Local Server Launcher for Windows
REM Запускает простой HTTP сервер для игры WeaveNet

setlocal enabledelayedexpansion
chcp 65001 >nul

REM Получаем директорию скрипта
set SCRIPT_DIR=%~dp0
set GAME_DIR=%SCRIPT_DIR%WeaveNet
set PORT=%1
if "%PORT%"=="" set PORT=8080

echo [INFO] WeaveNet - Local Server
echo ==============================
echo [INFO] Game Directory: %GAME_DIR%
echo [INFO] Port: %PORT%
echo.

if not exist "%GAME_DIR%" (
    echo [ERROR] Game directory not found: %GAME_DIR%
    pause
    exit /b 1
)

if not exist "%GAME_DIR%\index.html" (
    echo [ERROR] index.html not found in %GAME_DIR%
    pause
    exit /b 1
)

echo [OK] Starting server...
echo [INFO] Open in browser: http://localhost:%PORT%
echo [INFO] Press Ctrl+C to stop
echo.

cd /d "%GAME_DIR%"

REM Check for Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    python -m http.server %PORT%
) else (
    python3 --version >nul 2>&1
    if %errorlevel% equ 0 (
        python3 -m http.server %PORT%
    ) else (
        echo [ERROR] Python not found. Please install Python to run the local server.
        echo Download from: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)
