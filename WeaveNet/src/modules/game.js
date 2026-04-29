/**
 * @fileoverview Основной класс игры WeaveNet - Свободный Сигнал
 * [ЧТО] Центральный модуль, объединяющий все системы: сетку, рендерер, экономику, сохранения.
 * [ЗАЧЕМ] Управляет игровым циклом, обработкой ввода, UI и координацией между модулями.
 * [PLAN] Все разделы (интеграция)
 */

// Импорт модулей (для браузерного использования через script tags)
// В браузере классы будут доступны глобально после подключения соответствующих файлов

class Game {
    /**
     * [ЧТО] Конструктор основного игрового объекта.
     * [ЗАЧЕМ] Инициализирует canvas, создаёт экземпляры всех модулей, запускает игру.
     */
    constructor() {
        // Получение canvas и контекста
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // [ЧТО] Создание экземпляра гексагональной сетки.
        // [ЗАЧЕМ] HexGrid хранит данные карты и координатную систему.
        // [PLAN] 1.1. Гексагональная основа
        this.grid = new HexGrid(15);
        
        // [ЧТО] Создание рендерера для отрисовки сетки.
        // [ЗАЧЕМ] GridRenderer инкапсулирует всю логику отрисовки.
        // [PLAN] 2.3. Визуализация покрытия
        this.renderer = new GridRenderer(this.grid);
        
        // [ЧТО] Создание менеджера экономики.
        // [ЗАЧЕМ] EconomyManager управляет ресурсами информации и энергии.
        // [PLAN] 4. Экономика
        this.economy = new EconomyManager(this.grid);
        
        // [ЧТО] Создание менеджера сохранений.
        // [ЗАЧЕМ] SaveManager обрабатывает автосохранения и загрузку.
        // [PLAN] 8.3. Сохранение и экспорт
        this.saveManager = new SaveManager(this);
        
        // Время игры
        this.startTime = Date.now();
        this.gameTime = 0;
        this.speed = 1;
        this.paused = false;
        
        // Камера (перетаскивание)
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Выбранный гекс
        this.selectedHex = null;
        
        // Запуск инициализации
        this.init();
    }

    /**
     * [ЧТО] Основная инициализация игры при старте.
     * [ЗАЧЕМ] Настраивает размер canvas, камеру, карту, обработчики событий и загружает сохранение.
     */
    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Центрирование камеры
        this.grid.offsetX = this.canvas.width / 2;
        this.grid.offsetY = this.canvas.height / 2;

        // Инициализация карты (форма России)
        // [PLAN] 1.4. Схожесть карты на реальную карту
        this.grid.initMap(47, 38);

        // Попытка загрузки сохранённой игры
        this.saveManager.loadLastSave();

        // Настройка обработчиков событий
        this.setupEventListeners();
        this.setupUI();

        // Запуск игрового цикла
        this.lastUpdate = Date.now();
        this.loop();
    }

    /**
     * [ЧТО] Обработка изменения размера окна браузера.
     * [ЗАЧЕМ] Адаптирует canvas под текущий размер окна.
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 60;
    }

    /**
     * [ЧТО] Настройка обработчиков мыши и клавиатуры.
     * [ЗАЧЕМ] Обрабатывает перетаскивание карты, клики по гексам, зум.
     * [PLAN] 6.3. Навигация по карте
     */
    setupEventListeners() {
        // Перетаскивание карты и клик по гексу
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;

                const rect = this.canvas.getBoundingClientRect();
                const hex = this.grid.screenToHex(
                    e.clientX - rect.left,
                    e.clientY - rect.top
                );
                this.selectHex(hex.q, hex.r);
            }
        });

        // Движение мыши (перетаскивание)
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                this.grid.offsetX += dx;
                this.grid.offsetY += dy;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                
                // Инвалидация кэша зон покрытия при движении
                this.renderer.invalidateCoverageCache();
            }
        });

        // Отпускание кнопки мыши
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Зум колесиком
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.grid.zoom = Math.max(0.5, Math.min(3, this.grid.zoom * zoomFactor));
        });

        // Блокировка контекстного меню
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    /**
     * [ЧТО] Настройка кнопок скорости игры в UI.
     * [ЗАЧЕМ] Позволяет игроку менять скорость симуляции или ставить паузу.
     * [PLAN] 6.1. Панель ресурсов и таймер
     */
    setupUI() {
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const speed = parseInt(btn.dataset.speed);
                if (speed === 0) {
                    this.paused = true;
                } else {
                    this.paused = false;
                    this.speed = speed;
                }
            });
        });
    }

    /**
     * [ЧТО] Выбор гекса и открытие контекстной панели.
     * [ЗАЧЕМ] Позволяет взаимодействовать с объектами на карте.
     * @param {number} q - q координата гекса
     * @param {number} r - r координата гекса
     */
    selectHex(q, r) {
        const hex = this.grid.getHex(q, r);
        if (!hex) {
            this.closeContextPanel();
            return;
        }

        this.selectedHex = hex;
        this.showContextPanel(hex);
    }

    /**
     * [ЧТО] Отображение контекстной панели с информацией о гексе.
     * [ЗАЧЕМ] Показывает детали местности, преград, объектов и кнопки управления.
     * [PLAN] 6.2. Информация об объекте
     * @param {Object} hex - Данные выбранного гекса
     */
    showContextPanel(hex) {
        const panel = document.getElementById('context-panel');
        const title = document.getElementById('panel-title');
        const content = document.getElementById('panel-content');
        const buttons = document.getElementById('panel-buttons');

        let info = '';

        // Тип местности
        let terrainName = 'Равнина';
        if (hex.terrain === 'desert') terrainName = 'Пустыня';
        if (hex.terrain === 'snow') terrainName = 'Снежная пустошь';
        info += `<div class="panel-row"><span>Местность:</span><span>${terrainName}</span></div>`;

        // Преграда
        if (hex.obstacle) {
            let obsName = 'Горы';
            if (hex.obstacle === 'chasm') obsName = 'Пропасть';
            if (hex.obstacle === 'water') obsName = 'Вода';
            info += `<div class="panel-row"><span>Преграда:</span><span style="color:#f87171">${obsName}</span></div>`;
        }

        // Объект
        if (hex.object) {
            const modeNames = {
                'inactive': '⚪ Не активный',
                'economy': '🟡 Экономный',
                'active': '🟢 Активный',
                'blocked': '🔴 Блокировка'
            };
            info += `<div class="panel-row"><span>Объект:</span><span>${hex.object.type}</span></div>`;
            info += `<div class="panel-row"><span>Режим:</span><span>${modeNames[hex.object.mode] || hex.object.mode}</span></div>`;

            const modeHints = {
                'inactive': 'Включить здание (начнёт потреблять энергию)',
                'economy': 'Полная мощность (радиус 100%, стандартное потребление)',
                'active': 'Экономный режим (радиус 50%, низкое потребление)',
                'blocked': 'Разблокировать здание'
            };
            const demolishHint = hex.object.type === 'Роутер'
                ? 'Снести роутер (вернётся 15 информации)'
                : 'Снести вышку (вернётся 50 информации)';

            buttons.innerHTML = `
                <button class="panel-btn btn-mode tooltip" data-tooltip="${modeHints[hex.object.mode]}" onclick="game.toggleMode('${hex.q},${hex.r}')">Сменить режим</button>
                <button class="panel-btn btn-demolish tooltip" data-tooltip="${demolishHint}" onclick="game.demolish('${hex.q},${hex.r}')">Снести</button>
            `;
        } else if (!hex.obstacle) {
            buttons.innerHTML = `
                <button class="panel-btn btn-mode tooltip" data-tooltip="Базовый узел: радиус 5, потребление 2 энергии/с" onclick="game.buildRouter('${hex.q},${hex.r}')">Роутер (30)</button>
                <button class="panel-btn btn-mode tooltip" data-tooltip="Мощный узел: радиус 10, потребление 8 энергии/с" onclick="game.buildTower('${hex.q},${hex.r}')">Вышка (100)</button>
            `;
        }

        title.textContent = `Гекс [${hex.q}, ${hex.r}]`;
        content.innerHTML = info;
        panel.classList.add('visible');
    }

    /**
     * [ЧТО] Закрытие контекстной панели.
     * [ЗАЧЕМ] Скрывает панель и сбрасывает выбранный гекс.
     */
    closeContextPanel() {
        document.getElementById('context-panel').classList.remove('visible');
        this.selectedHex = null;
    }

    /**
     * [ЧТО] Постройка роутера на указанном гексе.
     * [ЗАЧЕМ] Размещает базовый узел сети за 30 информации.
     * [PLAN] 2.1. Типы строений
     * @param {string} key - Ключ гекса "q,r"
     */
    buildRouter(key) {
        const [q, r] = key.split(',').map(Number);
        if (this.economy.canAfford(30) && this.grid.canPlace(q, r)) {
            this.economy.spendInfo(30);
            this.grid.placeObject(q, r, {
                type: 'Роутер',
                mode: 'inactive',
                range: 5,
                energyCost: 2
            });
            this.renderer.invalidateCoverageCache();
            this.updateUI();
            this.showContextPanel(this.grid.getHex(q, r));
        }
    }

    /**
     * [ЧТО] Постройка вышки на указанном гексе.
     * [ЗАЧЕМ] Размещает мощный узел сети за 100 информации.
     * [PLAN] 2.1. Типы строений
     * @param {string} key - Ключ гекса "q,r"
     */
    buildTower(key) {
        const [q, r] = key.split(',').map(Number);
        if (this.economy.canAfford(100) && this.grid.canPlace(q, r)) {
            this.economy.spendInfo(100);
            this.grid.placeObject(q, r, {
                type: 'Вышка',
                mode: 'inactive',
                range: 10,
                energyCost: 8
            });
            this.renderer.invalidateCoverageCache();
            this.updateUI();
            this.showContextPanel(this.grid.getHex(q, r));
        }
    }

    /**
     * [ЧТО] Переключение режима работы объекта.
     * [ЗАЧЕМ] Циклически меняет режим: inactive → economy → active → blocked.
     * [PLAN] 2.2. Режимы работы
     * @param {string} key - Ключ гекса "q,r"
     */
    toggleMode(key) {
        const [q, r] = key.split(',').map(Number);
        const hex = this.grid.getHex(q, r);
        if (hex && hex.object) {
            const modes = ['inactive', 'economy', 'active', 'blocked'];
            const currentIndex = modes.indexOf(hex.object.mode);
            hex.object.mode = modes[(currentIndex + 1) % modes.length];
            this.renderer.invalidateCoverageCache();
            this.showContextPanel(hex);
        }
    }

    /**
     * [ЧТО] Снос объекта с возвратом 50% стоимости.
     * [ЗАЧЕМ] Удаляет строение и освобождает гекс.
     * [PLAN] 4.3. Управление инфраструктурой
     * @param {string} key - Ключ гекса "q,r"
     */
    demolish(key) {
        const [q, r] = key.split(',').map(Number);
        const hex = this.grid.getHex(q, r);
        if (hex && hex.object) {
            const cost = hex.object.type === 'Роутер' ? 30 : 100;
            this.economy.refundInfo(cost);
            this.grid.removeObject(q, r);
            this.renderer.invalidateCoverageCache();
            this.updateUI();
            this.showContextPanel(hex);
        }
    }

    /**
     * [ЧТО] Обновление отображения ресурсов в UI.
     * [ЗАЧЕМ] Показывает текущие запасы и ставки прироста/расхода.
     * [PLAN] 6.1. Панель ресурсов и таймер
     */
    updateUI() {
        const state = this.economy.getState();
        document.getElementById('info-value').textContent = Math.floor(state.info);
        document.getElementById('energy-value').textContent = Math.floor(state.energy);
        document.getElementById('info-rate').textContent = `${state.infoRate >= 0 ? '+' : ''}${state.infoRate.toFixed(1)}/с`;
        document.getElementById('energy-rate').textContent = `${state.energyRate >= 0 ? '+' : ''}${state.energyRate.toFixed(1)}/с`;

        document.getElementById('info-rate').className = `resource-label ${state.infoRate >= 0 ? 'info-positive' : 'info-negative'}`;
        document.getElementById('energy-rate').className = `resource-label ${state.energyRate >= 0 ? 'info-positive' : 'info-negative'}`;
    }

    /**
     * [ЧТО] Обновление таймера игрового времени.
     * [ЗАЧЕМ] Отображает общее время игры в формате MM:SS.
     * [PLAN] 6.1. Панель ресурсов и таймер
     * @param {number} deltaTime - Время между кадрами
     */
    updateTimer(deltaTime) {
        if (!this.paused) {
            this.gameTime += deltaTime * this.speed;
        }

        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        document.getElementById('timer').textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * [ЧТО] Оптимизированная отрисовка только видимой области карты.
     * [ЗАЧЕМ] Повышает FPS при большом зуме, рисуя только гексы в поле зрения.
     * [PLAN] 6.3. Навигация по карте
     */
    renderOptimized() {
        // Очистка экрана
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Расчёт видимой области в гексагональных координатах
        const margin = 2;
        const viewWidth = (this.canvas.width / this.grid.zoom) / this.grid.hexSize;
        const viewHeight = (this.canvas.height / this.grid.zoom) / this.grid.hexSize;

        const centerX = (-this.grid.offsetX + this.canvas.width / 2) / (this.grid.zoom * this.grid.hexSize);
        const centerY = (-this.grid.offsetY + this.canvas.height / 2) / (this.grid.zoom * this.grid.hexSize);

        // Расширенные границы для корректной отрисовки при зуме
        const zoomMargin = margin * Math.max(1, this.grid.zoom * 2);
        const extendedMinQ = Math.floor(centerX - viewWidth / 2 - zoomMargin);
        const extendedMaxQ = Math.ceil(centerX + viewWidth / 2 + zoomMargin);
        const extendedMinR = Math.floor(centerY - viewHeight / 2 - zoomMargin);
        const extendedMaxR = Math.ceil(centerY + viewHeight / 2 + zoomMargin);

        // Отрисовка видимых гексов через рендерер
        this.grid.map.forEach((hex, key) => {
            if (hex.q >= extendedMinQ && hex.q <= extendedMaxQ && 
                hex.r >= extendedMinR && hex.r <= extendedMaxR) {
                const center = this.grid.hexToScreen(hex.q, hex.r);
                
                const hexPadding = this.grid.hexSize * this.grid.zoom * 2;
                if (center.x > -hexPadding && center.x < this.canvas.width + hexPadding &&
                    center.y > -hexPadding && center.y < this.canvas.height + hexPadding) {
                    
                    let color = '#4ade80';
                    if (hex.terrain === 'desert') color = '#fbbf24';
                    if (hex.terrain === 'snow') color = '#f3f4f6';

                    this.renderer.drawHex(this.ctx, center.x, center.y, 
                        this.grid.hexSize * this.grid.zoom, color, hex.obstacle);

                    if (hex.object) {
                        this.renderer.drawObject(this.ctx, center.x, center.y, 
                            this.grid.hexSize * this.grid.zoom, hex.object);
                    }
                }
            }
        });

        // Отрисовка зон покрытия
        this.renderer.drawCoverageMerged(this.ctx, 'load');

        // Отрисовка выбранного гекса
        if (this.selectedHex) {
            const center = this.grid.hexToScreen(this.selectedHex.q, this.selectedHex.r);
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const hx = center.x + this.grid.hexSize * this.zoom * 1.1 * Math.cos(angle);
                const hy = center.y + this.grid.hexSize * this.zoom * 1.1 * Math.sin(angle);
                if (i === 0) this.ctx.moveTo(hx, hy);
                else this.ctx.lineTo(hx, hy);
            }
            this.ctx.closePath();
            this.ctx.strokeStyle = '#4a9eff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
    }

    /**
     * [ЧТО] Главный игровой цикл (update + render).
     * [ЗАЧЕМ] Выполняет обновление логики и отрисовку каждый кадр.
     */
    loop() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Обновление экономики
        this.economy.update(deltaTime, this.speed);
        
        // Обновление таймера автосохранения
        this.saveManager.update(deltaTime, this.speed);
        
        // Обновление таймера игры
        this.updateTimer(deltaTime);
        
        // Отрисовка
        this.renderOptimized();

        requestAnimationFrame(() => this.loop());
    }
}

// Глобальная функция для закрытия панели из HTML
function closeContextPanel() {
    if (window.game) {
        window.game.closeContextPanel();
    }
}

// Глобальная функция сброса прогресса
function resetGameProgress() {
    if (confirm('⚠️ Вы уверены, что хотите сбросить весь прогресс игры?')) {
        if (window.game && window.game.saveManager) {
            window.game.saveManager.resetProgress();
            location.reload();
        }
    }
}

// Инициализация игры при загрузке страницы
window.addEventListener('load', () => {
    window.game = new Game();

    // Обработчик кнопки сброса
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetGameProgress);
    }
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
