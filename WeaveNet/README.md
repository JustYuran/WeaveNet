# 🚀 Запуск игры WeaveNet

## Решение проблемы с безопасностью браузеров

Ошибка `Unsafe attempt to load URL` возникает потому, что современные браузеры блокируют загрузку локальных файлов через протокол `file://` из соображений безопасности. 

### ✅ Правильный способ запуска:

**Для Linux/macOS:**
```bash
./run_game.sh
```
Или с указанием порта:
```bash
./run_game.sh 3000
```

**Для Windows:**
Дважды кликните по файлу `run_game.bat` или запустите через командную строку:
```cmd
run_game.bat
```

После запуска откройте браузер и перейдите по адресу:
```
http://localhost:8080
```

## Требования

- **Python 3** (рекомендуется) или Python 2.7
- Любой современный браузер (Chrome, Firefox, Edge, Safari)

## Установка Python (если не установлен)

- **Windows**: Скачайте с [python.org](https://www.python.org/downloads/)
- **macOS**: `brew install python3` или скачайте с python.org
- **Linux**: `sudo apt install python3` (Ubuntu/Debian) или `sudo dnf install python3` (Fedora)

## Альтернативные способы запуска

Если у вас установлен Node.js:
```bash
npx http-server ./WeaveNet -p 8080
```

Если у вас установлен PHP:
```bash
cd WeaveNet && php -S localhost:8080
```

## Структура проекта

```
/workspace
├── run_game.sh          # Скрипт запуска для Linux/macOS
├── run_game.bat         # Скрипт запуска для Windows
├── WeaveNet/
│   ├── index.html       # Главный файл игры
│   ├── src/
│   │   └── game.js      # Игровая логика
│   ├── assets/          # Ресурсы (графика, звуки)
│   └── docs/            # Документация
├── ChangeLog/           # История изменений
└── Rules/               # Правила и планы
```
