/**
 * Game - Главный класс игры
 * [ЧТО] Объединяет все модули и управляет игровым процессом
 * [ЗАЧЕМ] Централизованное управление игрой, обработка ввода, игровой цикл
 * [PLAN] Добавить состояния игры, меню, настройки
 * 
 * [ERROR] Ошибка 3 - старая система не работала -> ИСПРАВЛЕНО
 * [PLAN] Полностью переписанная архитектура с простым полем из 7 гексов
 */

class Game {
    /**
     * Конструктор игры
     * [ЧТО] Инициализация всех систем игры
     * [ЗАЧЕМ] Подготовка к запуску игрового процесса
     * [PLAN] Добавить загрузку сохранений при старте
     */
    constructor() {
        // [ЧТО] Получаем canvas и создаём рендерер
        // [ЗАЧЕМ] Основа для отрисовки графики
        // [PLAN] Поддержка нескольких canvas для UI
        this.canvas = document.getElementById('game-canvas');
        
        // [ЧТО] Создаём гексагональную сетку из 7 гексов
        // [ЗАЧЕМ] Игровое поле для размещения построек
        // [PLAN] Настройка размера через параметры
        this.hexGrid = new HexGrid(60);
        
        // [ЧТО] Создаём рендерер для отрисовки
        // [ЗАЧЕМ] Визуализация гексов и построек
        // [PLAN] Добавить эффекты и анимации
        this.gridRenderer = new GridRenderer(this.canvas, this.hexGrid);
        
        // [ЧТО] Создаём менеджер пользователей
        // [ЗАЧЕМ] Управление пользователями на карте (до 6 на гекс, макс 1.5*число полей)
        // [PLAN] Интеграция с постройками и другими системами
        this.userManager = new UserManager(this.hexGrid);
        
        // [ЧТО] Передаём userManager в gridRenderer для отрисовки
        // [ЗАЧЕМ] Рендерер должен знать о пользователях
        // [PLAN] Рефакторинг: сделать userManager параметром конструктора
        this.gridRenderer.userManager = this.userManager;
        
        // [ЧТО] Создаём начальных пользователей (заполняем карту)
        // [ЗАЧЕМ] Стартовое состояние игры с активностью
        // [PLAN] Настроить количество через параметры
        this.userManager.populateInitialUsers(10);
        
        // [ЧТО] Доступные типы построек
        // [ЗАЧЕМ] Игрок может выбирать что строить
        // [PLAN] Загрузка из конфига или JSON
        this.buildingTypes = [
            { id: 'tower', name: 'Вышка', cost: 50, color: '#4a9eff', description: 'Базовая вышка связи' },
            { id: 'relay', name: 'Ретранслятор', cost: 30, color: '#4ade80', description: 'Усиливает сигнал' },
            { id: 'generator', name: 'Генератор', cost: 100, color: '#fbbf24', description: 'Производит энергию' }
        ];
        
        // [ЧТО] Текущие ресурсы игрока
        // [ЗАЧЕМ] Валюта для строительства
        // [PLAN] Добавить пассивный доход от построек
        this.resources = {
            info: 200,
            energy: 100
        };
        
        // [ЧТО] Выбранный тип постройки для размещения
        // [ЗАЧЕМ] Режим строительства
        // [PLAN] Добавить режим сноса зданий
        this.selectedBuildingType = null;
        
        // [ЧТО] Игровой цикл (requestAnimationFrame)
        // [ЗАЧЕМ] Плавная отрисовка и обновления
        // [PLAN] Добавить паузу и ускорение времени
        this.animationId = null;
        
        // [ЧТО] Обработчики событий мыши
        // [ЗАЧЕМ] Взаимодействие с игрой
        // [PLAN] Добавить поддержку тач-устройств
        this.setupEventListeners();
        
        // [ЧТО] Обновляем UI с ресурсами
        // [ЗАЧЕМ] Игрок видит свои ресурсы
        // [PLAN] Анимировать изменения ресурсов
        this.updateResourceUI();
        
        // [ЧТО] Создаём панель построек сверху
        // [ЗАЧЕМ] Выбор типа постройки для строительства
        // [PLAN] Добавить категории и фильтры
        this.createBuildingPanel();
        
        console.log('[Game] Игра инициализирована');
    }
    
    /**
     * Создание панели построек в верхней части экрана
     * [ЧТО] Добавляет кнопки для выбора типа постройки
     * [ЗАЧЕМ] Игрок может выбрать что строить
     * [PLAN] Добавить иконки и описания
     */
    createBuildingPanel() {
        // [ЧТО] Находим верхнюю панель
        // [ЗАЧЕМ] Добавим кнопки построек рядом с ресурсами
        // [PLAN] Стилизовать под общий дизайн
        const topBar = document.getElementById('top-bar');
        
        // [ЧТО] Создаём контейнер для кнопок построек
        // [ЗАЧЕМ] Группируем кнопки строительства
        // [PLAN] Добавить прокрутку если много кнопок
        const buildingPanel = document.createElement('div');
        buildingPanel.id = 'building-panel';
        buildingPanel.style.cssText = `
            display: flex;
            gap: 10px;
            align-items: center;
            margin-left: 30px;
        `;
        
        // [ЧТО] Создаём кнопку для каждого типа постройки
        // [ЗАЧЕМ] Игрок видит все доступные варианты
        // [PLAN] Показывать только доступные по ресурсам
        this.buildingTypes.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'speed-btn tooltip';
            btn.dataset.building = type.id;
            btn.style.cssText = `
                background: ${type.color};
                border: 2px solid transparent;
                min-width: 120px;
            `;
            btn.textContent = `${type.name} (${type.cost})`;
            
            // [ЧТО] Добавляем tooltip с описанием
            // [ЗАЧЕМ] Игрок узнаёт что делает постройка
            // [PLAN] Добавить подробную информацию
            btn.dataset.tooltip = type.description;
            
            // [ЧТО] Обработчик клика - выбор типа постройки
            // [ЗАЧЕМ] Активация режима строительства
            // [PLAN] Показать preview на карте
            btn.addEventListener('click', () => this.selectBuildingType(type));
            
            buildingPanel.appendChild(btn);
        });
        
        // [ЧТО] Добавляем кнопку отмены строительства
        // [ЗАЧЕМ] Выход из режима строительства
        // [PLAN] Горячая клавиша Escape
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'speed-btn';
        cancelBtn.style.cssText = 'background: #dc2626; border-color: #dc2626;';
        cancelBtn.textContent = 'Отмена';
        cancelBtn.addEventListener('click', () => this.cancelBuilding());
        buildingPanel.appendChild(cancelBtn);
        
        // [ЧТО] Вставляем панель после ресурсов
        // [ЗАЧЕМ] Логичное расположение интерфейса
        // [PLAN] Адаптивная вёрстка для мобильных
        const resourceGroup = topBar.querySelector('.resource-group');
        topBar.insertBefore(buildingPanel, resourceGroup.nextSibling);
    }
    
    /**
     * Выбор типа постройки для размещения
     * [ЧТО] Устанавливает активный тип постройки
     * [ЗАЧЕМ] Включение режима строительства
     * [PLAN] Подсветка доступных гексов
     */
    selectBuildingType(type) {
        this.selectedBuildingType = type;
        this.gridRenderer.setBuildingTypeToPlace(type);
        console.log(`[Game] Выбрана постройка: ${type.name}`);
        
        // [ЧТО] Визуально выделяем выбранную кнопку
        // [ЗАЧЕМ] Игрок видит что выбрано
        // [PLAN] Анимация выделения
        document.querySelectorAll('#building-panel button').forEach(btn => {
            btn.style.borderColor = 'transparent';
            if (btn.dataset.building === type.id) {
                btn.style.borderColor = 'white';
                btn.style.boxShadow = '0 0 10px white';
            }
        });
    }
    
    /**
     * Отмена режима строительства
     * [ЧТО] Сбрасывает выбранный тип постройки
     * [ЗАЧЕМ] Выход из режима строительства
     * [PLAN] Сброс выделения гекса
     */
    cancelBuilding() {
        this.selectedBuildingType = null;
        this.gridRenderer.setBuildingTypeToPlace(null);
        this.gridRenderer.setSelectedHex(null);
        console.log('[Game] Строительство отменено');
        
        // [ЧТО] Убираем выделение с кнопок
        // [ЗАЧЕМ] Сброс визуального состояния
        // [PLAN] Вернуть обычный стиль
        document.querySelectorAll('#building-panel button').forEach(btn => {
            btn.style.borderColor = 'transparent';
            btn.style.boxShadow = 'none';
        });
    }
    
    /**
     * Настройка обработчиков событий
     * [ЧТО] Регистрирует обработчики кликов и движения мыши
     * [ЗАЧЕМ] Взаимодействие игрока с игровым полем
     * [PLAN] Добавить жесты для мобильных
     */
    setupEventListeners() {
        // [ЧТО] Обработка клика по canvas
        // [ЗАЧЕМ] Выбор гекса и размещение построек
        // [PLAN] Разделить левый и правый клик
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // [ЧТО] Обработка движения мыши
        // [ЗАЧЕМ] Подсветка гекса под курсором
        // [PLAN] Оптимизировать частоту обновлений
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // [ЧТО] Обработка клавиши Escape
        // [ЗАЧЕМ] Отмена строительства
        // [PLAN] Другие горячие клавиши
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelBuilding();
            }
        });
    }
    
    /**
     * Обработка клика по игровому полю
     * [ЧТО] Определяет гекс под курсором и выполняет действие
     * [ЗАЧЕМ] Размещение построек или выбор гекса
     * [PLAN] Контекстное меню для гекса
     */
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // [ЧТО] Находим гекс под курсором
        // [ЗАЧЕМ] Определение целевого гекса
        // [PLAN] Точная проверка внутри шестиугольника
        const hexId = this.gridRenderer.getHexAtPosition(mouseX, mouseY);
        
        if (hexId !== null) {
            const hex = this.hexGrid.getHexById(hexId);
            
            // [ЧТО] Если режим строительства активен
            // [ЗАЧЕМ] Размещение выбранной постройки
            // [PLAN] Проверка стоимости и требований
            if (this.selectedBuildingType) {
                this.placeBuilding(hex);
            } else {
                // [ЧТО] Просто выделяем гекс
                // [ЗАЧЕМ] Показать информацию о гексе
                // [PLAN] Показать контекстную панель
                this.gridRenderer.setSelectedHex(hexId);
                this.updateBottomPanel(hex);
                console.log(`[Game] Выбран гекс ${hexId}`);
            }
        } else {
            // [ЧТО] Клик вне гекса - снимаем выделение
            // [ЗАЧЕМ] Сброс состояния
            // [PLAN] Закрыть контекстные панели
            this.gridRenderer.setSelectedHex(null);
            this.hideBottomPanel();
        }
    }
    
    /**
     * Обновление нижней панели с информацией о гексе
     * @param {Object} hex - Объект гекса
     */
    updateBottomPanel(hex) {
        // [ЧТО] Показываем панель с информацией
        // [ЗАЧЕМ] Игрок видит детали о выбранном гексе
        document.getElementById('no-selection-message').classList.add('hidden');
        document.getElementById('hex-info').classList.remove('hidden');
        document.getElementById('hex-actions').classList.remove('hidden');
        
        // [ЧТО] Заполняем информацию о гексе
        // [ЗАЧЕМ] Отображение данных
        document.getElementById('hex-title').textContent = `Гекс #${hex.id}`;
        document.getElementById('hex-coords').textContent = `(${hex.q}, ${hex.r})`;
        
        const terrainNames = {
            'plains': 'Равнина',
            'forest': 'Лес',
            'mountain': 'Горы',
            'water': 'Вода'
        };
        document.getElementById('hex-terrain').textContent = terrainNames[hex.terrain] || hex.terrain;
        
        if (hex.building) {
            document.getElementById('hex-building').textContent = hex.building.name;
            document.getElementById('btn-demolish').classList.remove('hidden');
        } else {
            document.getElementById('hex-building').textContent = 'Нет';
            document.getElementById('btn-demolish').classList.add('hidden');
        }
        
        // [ЧТО] Считаем пользователей на гексе
        // [ЗАЧЕМ] Показать активность
        const usersOnHex = this.userManager ? this.userManager.getUsersOnHex(hex.id).length : 0;
        document.getElementById('hex-users').textContent = usersOnHex;
        
        // [ЧТО] Считаем соседей
        // [ЗАЧЕМ] Показать связи
        const neighborCount = Object.keys(hex.neighbors).filter(k => hex.neighbors[k] !== null).length;
        document.getElementById('hex-neighbors').textContent = neighborCount;
    }
    
    /**
     * Скрытие нижней панели
     */
    hideBottomPanel() {
        document.getElementById('no-selection-message').classList.remove('hidden');
        document.getElementById('hex-info').classList.add('hidden');
        document.getElementById('hex-actions').classList.add('hidden');
    }
    
    /**
     * Обработка движения мыши
     * [ЧТО] Подсветка гекса под курсором
     * [ЗАЧЕМ] Визуальная обратная связь
     * [PLAN] Tooltip с информацией о гексе
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // [ЧТО] Находим гекс под курсором
        // [ЗАЧЕМ] Для подсветки и возможного взаимодействия
        // [PLAN] Оптимизировать проверку
        const hexId = this.gridRenderer.getHexAtPosition(mouseX, mouseY);
        
        // [ЧТО] Меняем курсор если над гексом
        // [ЗАЧЕМ] Визуальная подсказка о возможности взаимодействия
        // [PLAN] Разные курсоры для разных режимов
        if (hexId !== null) {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Размещение постройки на гексе
     * [ЧТО] Проверяет возможность и размещает постройку
     * [ЗАЧЕМ] Основная механика строительства
     * [PLAN] Анимация появления постройки
     */
    placeBuilding(hex) {
        // [ЧТО] Проверяем свободен ли гекс
        // [ЗАЧЕМ] Нельзя строить поверх другой постройки
        // [PLAN] Возможность улучшения существующих
        if (hex.building) {
            console.log('[Game] Гекс занят!');
            return;
        }
        
        // [ЧТО] Проверяем достаточно ли ресурсов
        // [ЗАЧЕМ] Баланс игры
        // [PLAN] Разные ресурсы для разных построек
        if (this.resources.info < this.selectedBuildingType.cost) {
            console.log('[Game] Недостаточно ресурсов!');
            return;
        }
        
        // [ЧТО] Списываем стоимость постройки
        // [ЗАЧЕМ] Расход ресурсов
        // [PLAN] Добавить возврат при сносе
        this.resources.info -= this.selectedBuildingType.cost;
        this.updateResourceUI();
        
        // [ЧТО] Создаём объект постройки
        // [ЗАЧЕМ] Данные для отображения и логики
        // [PLAN] Добавить уровни и характеристики
        const building = {
            ...this.selectedBuildingType,
            level: 1,
            placedAt: Date.now()
        };
        
        // [ЧТО] Размещаем постройку на гексе
        // [ЗАЧЕМ] Обновление состояния игры
        // [PLAN] Триггеры событий при строительстве
        this.hexGrid.placeBuilding(hex.id, building);
        
        console.log(`[Game] Постройка "${building.name}" размещена на гексе ${hex.id}`);
        
        // [ЧТО] Отменяем режим строительства после размещения
        // [ЗАЧЕМ] Игрок может передумать строить дальше
        // [PLAN] Опция "строить несколько подряд"
        this.cancelBuilding();
    }
    
    /**
     * Обновление отображения ресурсов
     * [ЧТО] Обновляет числа в верхней панели
     * [ЗАЧЕМ] Игрок видит текущие ресурсы
     * [PLAN] Анимация изменений
     */
    updateResourceUI() {
        document.getElementById('info-value').textContent = Math.floor(this.resources.info);
        document.getElementById('energy-value').textContent = Math.floor(this.resources.energy);
    }
    
    /**
     * Запуск игрового цикла
     * [ЧТО] Начинает постоянную отрисовку и обновления
     * [ЗАЧЕМ] Работа игры в реальном времени
     * [PLAN] Добавить расчёт FPS
     */
    start() {
        console.log('[Game] Запуск игрового цикла');
        
        // [ЧТО] Функция кадра
        // [ЗАЧЕМ] Рекурсивный вызов для плавной анимации
        // [PLAN] Дельта-время для независимости от FPS
        const gameLoop = () => {
            this.update();
            this.render();
            this.animationId = requestAnimationFrame(gameLoop);
        };
        
        // [ЧТО] Запускаем первый кадр
        // [ЗАЧЕМ] Начало цикла
        // [PLAN] Предварительная загрузка ресурсов
        gameLoop();
    }
    
    /**
     * Обновление игровой логики
     * [ЧТО] Расчёт изменений в игре
     * [ЗАЧЕМ] Обновление состояния между кадрами
     * [PLAN] Пассивный доход, таймеры, события
     */
    update() {
        // [ЧТО] Обновляем состояние пользователей (перемещение раз в секунду)
        // [ЗАЧЕМ] Пользователи двигаются по карте
        // [PLAN] Добавить другие игровые системы
        if (this.userManager) {
            this.userManager.update();
        }
    }
    
    /**
     * Отрисовка кадра
     * [ЧТО] Вызывает рендерер для отрисовки
     * [ЗАЧЕМ] Обновление изображения на экране
     * [PLAN] Слои для разных элементов
     */
    render() {
        this.gridRenderer.render();
    }
    
    /**
     * Остановка игры
     * [ЧТО] Прекращает игровой цикл
     * [ЗАЧЕМ] Пауза или закрытие игры
     * [PLAN] Сохранение перед выходом
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        console.log('[Game] Игра остановлена');
    }
}

// [ЧТО] Автозапуск игры при загрузке страницы
// [ЗАЧЕМ] Старт игры без дополнительных действий
// [PLAN] Экран загрузки, прелоадер
window.addEventListener('DOMContentLoaded', () => {
    console.log('[Game] DOM загружен, создаём игру...');
    const game = new Game();
    game.start();
    
    // [ЧТО] Сохраняем ссылку на игру в window
    // [ЗАЧЕМ] Для отладки в консоли
    // [PLAN] Убрать в релизной версии
    window.game = game;
});

// [ЧТО] Экспорт класса для использования в других модулях
// [ЗАЧЕМ] Модульная архитектура требует явного экспорта
// [PLAN] Использовать ES6 modules в будущем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
