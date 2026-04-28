#!/bin/bash
# Скрипт запуска сервера WeaveNet для Linux/Mac
# Сохраните как start-server.sh в папке mesh-game

echo "========================================"
echo "  WeaveNet - Mesh Network Game Server"
echo "========================================"
echo ""

# Проверка наличия Python
if ! command -v python3 &> /dev/null; then
    echo "ОШИБКА: Python 3 не найден!"
    echo "Установите Python 3"
    exit 1
fi

echo "Запуск HTTP сервера на порту 8080..."
echo ""
echo "Откройте в браузере: http://localhost:8080"
echo ""
echo "Нажмите Ctrl+C для остановки сервера"
echo "========================================"
echo ""

# Запуск сервера
python3 -m http.server 8080
