#!/bin/bash

# WeaveNet Local Server Launcher
# Запускает простой HTTP сервер для игры WeaveNet

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="$SCRIPT_DIR/WeaveNet"
PORT=${1:-8080} # Порт по умолчанию 8080, можно передать как аргумент

echo "🌐 WeaveNet - Локальный сервер"
echo "=============================="
echo "📂 Директория игры: $GAME_DIR"
echo "🔌 Порт: $PORT"
echo ""

if [ ! -d "$GAME_DIR" ]; then
    echo "❌ Ошибка: Директория игры не найдена: $GAME_DIR"
    exit 1
fi

if [ ! -f "$GAME_DIR/index.html" ]; then
    echo "❌ Ошибка: Файл index.html не найден в $GAME_DIR"
    exit 1
fi

echo "✅ Запуск сервера..."
echo "🚀 Откройте в браузере: http://localhost:$PORT"
echo "💡 Для остановки нажмите Ctrl+C"
echo ""

cd "$GAME_DIR"

# Попытка запустить через Python 3
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
else
    echo "❌ Ошибка: Python не найден. Установите Python для запуска локального сервера."
    exit 1
fi
