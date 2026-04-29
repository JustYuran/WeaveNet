@echo off
REM WeaveNet Local Server Launcher for Windows
REM Запускает простой HTTP сервер для игры WeaveNet

setlocal enabledelayedexpansion

REM Получаем директорию скрипта
set SCRIPT_DIR=%~dp0
set GAME_DIR=%SCRIPT_DIR%WeaveNet
set PORT=%1
if "%PORT%"=="" set PORT=8080

chcp 65001 >nul

echo 🌐 WeaveNet - Локальный сервер
echo ==============================
echo 📂 Директория игры: %GAME_DIR%
echo 🔌 Порт: %PORT%
echo.

if not exist "%GAME_DIR%" (
    echo ❌ Ошибка: Директория игры не найдена: %GAME_DIR%
    pause
    exit /b 1
)

if not exist "%GAME_DIR%\index.html" (
    echo ❌ Ошибка: Файл index.html не найден в %GAME_DIR%
    pause
    exit /b 1
)

echo ✅ Запуск сервера...
echo 🚀 Откройте в браузере: http://localhost:%PORT%
echo 💡 Для остановки нажмите Ctrl+C
echo.

cd /d "%GAME_DIR%"

REM Проверка наличия Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    python -m http.server %PORT%
) else (
    python3 --version >nul 2>&1
    if %errorlevel% equ 0 (
        python3 -m http.server %PORT%
    ) else (
        echo ❌ Ошибка: Python не найден. Установите Python для запуска локального сервера.
        echo Скачать можно с: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)
