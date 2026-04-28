@echo off
REM Скрипт запуска сервера WeaveNet для Windows
REM Сохраните как start-server.bat в папке mesh-game

chcp 65001 > nul
title WeaveNet Server
cls

echo ========================================
echo   WeaveNet - Mesh Network Game Server
echo ========================================
echo.

REM Проверка наличия Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ОШИБКА: Python не найден!
    echo Установите Python с https://www.python.org/
    pause
    exit /b 1
)

echo Запуск HTTP сервера на порту 8080...
echo.
echo Откройте в браузере: http://localhost:8080
echo.
echo Нажмите Ctrl+C для остановки сервера
echo ========================================
echo.

REM Запуск сервера
python -m http.server 8080

pause
