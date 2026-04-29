// WeaveNet - Свободный Сигнал
// Основная игровая логика

class HexGrid {
    constructor(hexSize = 30) {
        this.hexSize = hexSize;
        this.hexHeight = hexSize * Math.sqrt(3);
        this.hexWidth = hexSize * 2;
        this.map = new Map(); // Хранение гексов: "q,r" -> {type, object, terrain}
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1;
    }

    // Конвертация экранных координат в гексагональные (axial coordinates)
    screenToHex(screenX, screenY) {
        const adjX = (screenX - this.offsetX) / this.zoom;
        const adjY = (screenY - this.offsetY) / this.zoom;
        
        const q = (2/3 * adjX) / this.hexSize;
        const r = (-1/3 * adjX + Math.sqrt(3)/3 * adjY) / this.hexSize;
        
        return this.roundHex(q, r);
    }

    // Округление до ближайшего гекса
    roundHex(q, r) {
        let s = -q - r;
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);

        const qDiff = Math.abs(rq - q);
        const rDiff = Math.abs(rr - r);
        const sDiff = Math.abs(rs - s);

        if (qDiff > rDiff && qDiff > sDiff) {
            rq = -rr - rs;
        } else if (rDiff > sDiff) {
            rr = -rq - rs;
        }
        
        return { q: rq, r: rr };
    }

    // Получение ключа гекса
    getHexKey(q, r) {
        return `${q},${r}`;
    }

    // Получение центра гекса в экранных координатах
    hexToScreen(q, r) {
        const x = this.hexSize * (3/2 * q) * this.zoom + this.offsetX;
        const y = this.hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r) * this.zoom + this.offsetY;
        return { x, y };
    }

    // Инициализация карты
    initMap(width = 20, height = 15) {
        for (let q = -width; q <= width; q++) {
            for (let r = -height; r <= height; r++) {
                if (Math.abs(q + r) <= Math.max(width, height)) {
                    const key = this.getHexKey(q, r);
                    // Генерация типа местности
                    const rand = Math.random();
                    let terrain = 'plain';
                    if (rand > 0.85) terrain = 'desert';
                    else if (rand > 0.95) terrain = 'snow';
                    
                    // Генерация преград
                    let obstacle = null;
                    const obsRand = Math.random();
                    if (obsRand > 0.92) obstacle = 'mountain';
                    else if (obsRand > 0.90) obstacle = 'chasm';
                    else if (obsRand > 0.88) obstacle = 'water';
                    
                    this.map.set(key, {
                        q, r,
                        terrain,
                        obstacle,
                        object: null,
                        user: null
                    });
                }
            }
        }
    }

    // Отрисовка сетки
    // [ЧТО] Метод отрисовки всей сетки с объектами и зонами покрытия.
    // [ЗАЧЕМ] Обеспечивает послойную отрисовку: гексы -> зоны покрытия (контуром) -> объекты.
    //          Такой порядок не перекрывает гексы полупрозрачными зонами.
    // [PLAN] 2.3.1 Градиентное свечение, 2.3.2 Наложение зон
    draw(ctx) {
        ctx.save();
        
        // Сначала рисуем все гексы
        this.map.forEach((hex, key) => {
            const center = this.hexToScreen(hex.q, hex.r);
            
            // Цвет местности
            let color = '#4ade80'; // plain - зеленый
            if (hex.terrain === 'desert') color = '#fbbf24'; // пустыня - песочный
            if (hex.terrain === 'snow') color = '#f3f4f6'; // снег - белый
            
            // Рисуем гекс
            this.drawHex(ctx, center.x, center.y, this.hexSize * this.zoom, color, hex.obstacle);
            
            // Рисуем объект на гексе
            if (hex.object) {
                this.drawObject(ctx, center.x, center.y, this.hexSize * this.zoom, hex.object);
            }
        });
        
        // [ЧТО] Отрисовка зон покрытия в режиме 'load' (только контуры) с объединением пересекающихся зон.
        // [ЗАЧЕМ] При пересечении зон пунктирная линия исчезает в месте пересечения — зоны визуально объединяются.
        //          Это создаёт эффект единой зоны покрытия вместо нескольких отдельных кругов.
        // [PLAN] 2.3.1 Градиентное свечение, 2.3.2 Наложение зон
        this.drawCoverageMerged(ctx, 'load');
        
        // Затем рисуем все объекты поверх зон покрытия
        this.map.forEach((hex, key) => {
            if (hex.object) {
                const center = this.hexToScreen(hex.q, hex.r);
                this.drawObject(ctx, center.x, center.y, this.hexSize * this.zoom, hex.object);
            }
        });
        
        ctx.restore();
    }

    // Рисование одного гекса
    drawHex(ctx, x, y, size, color, obstacle = null) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hx = x + size * Math.cos(angle);
            const hy = y + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        
        // Заполнение
        ctx.fillStyle = color;
        if (obstacle) {
            if (obstacle === 'mountain') ctx.fillStyle = '#78716c';
            if (obstacle === 'chasm') ctx.fillStyle = '#1f2937';
            if (obstacle === 'water') ctx.fillStyle = '#3b82f6';
        }
        ctx.fill();
        
        // Обводка
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Индикатор преграды
        if (obstacle) {
            ctx.fillStyle = 'white';
            ctx.font = `${size * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let symbol = '⛰';
            if (obstacle === 'chasm') symbol = '⚡';
            if (obstacle === 'water') symbol = '💧';
            ctx.fillText(symbol, x, y);
        }
    }

    // Рисование объекта на гексе
    drawObject(ctx, x, y, size, object) {
        // Определение символа и цвета в зависимости от типа объекта
        let symbol = '📶'; // Роутер
        let color = '#4a9eff';
        if (object.type === 'Роутер') {
            symbol = '📶'; // Router
            color = '#4a9eff';
        } else if (object.type === 'Вышка') {
            symbol = '🗼'; // Tower
            color = '#f59e0b';
        }
        
        // Define color based on mode
        let modeColor = color;
        if (object.mode === 'inactive') {
            modeColor = '#9ca3af'; // gray for inactive
        } else if (object.mode === 'economy') {
            modeColor = '#fbbf24'; // yellow for economy
        } else if (object.mode === 'active') {
            modeColor = color; // original color for active
        } else if (object.mode === 'blocked') {
            modeColor = '#ef4444'; // red for blocked
        }
        
        // Рисуем символ объекта
        ctx.fillStyle = modeColor;
        ctx.font = `${size * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, x, y);
    }

    // [ЧТО] Рисование зоны покрытия объекта с разными режимами видимости.
    // [ЗАЧЕМ] Позволяет игроку видеть зону покрытия без перекрытия гексов и объектов.
    //          Режим "нагрузка" показывает только контур, не закрывая обзор.
    // [PLAN] 2.3.1 Градиентное свечение, 2.3.2 Наложение зон
    drawCoverage(ctx, x, y, size, object, coverageMode = 'main') {
        // Рисуем зону покрытия только для активных режимов (не для заблокированных и неактивных)
        if (object.mode !== 'active' && object.mode !== 'economy') {
            return;
        }
        
        // Определение цвета в зависимости от типа объекта
        let color = '#4a9eff';
        if (object.type === 'Вышка') {
            color = '#f59e0b';
        }
        
        // Определение цвета в зависимости от режима
        let modeColor = color;
        if (object.mode === 'economy') {
            modeColor = '#fbbf24'; // желтый для экономного
        }
        
        const rangeMultiplier = object.mode === 'economy' ? 0.5 : 1.0;
        const rangePixels = object.range * size * rangeMultiplier;
        
        // [ЧТО] Два режима отображения зоны покрытия: 'main' (основной) и 'load' (нагрузка/контур).
        // [ЗАЧЕМ] Режим 'load' показывает только контур без заполнения, чтобы не перекрывать гексы.
        //          Игрок может переключаться между режимами для лучшего обзора карты.
        // [PLAN] 2.3.1 Градиентное свечение
        if (coverageMode === 'load') {
            // Режим нагрузки: только контурная обводка без градиентного заполнения
            ctx.beginPath();
            ctx.arc(x, y, rangePixels, 0, Math.PI * 2);
            ctx.strokeStyle = `${modeColor}80`; // 50% непрозрачности для контура
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Пунктирная линия для режима нагрузки
            ctx.stroke();
            ctx.setLineDash([]); // Сброс пунктира
        } else {
            // Основной режим: градиентное заполнение с повышенной прозрачностью
            // Увеличиваем прозрачность чтобы не загораживать гексы
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, rangePixels);
            gradient.addColorStop(0, `${modeColor}30`); // 18% прозрачности в центре
            gradient.addColorStop(0.5, `${modeColor}15`); // 9% прозрачности на середине
            gradient.addColorStop(1, `${modeColor}08`); // 5% прозрачности по краям
            
            ctx.beginPath();
            ctx.arc(x, y, rangePixels, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Добавляем обводку для лучшей видимости
            ctx.strokeStyle = `${modeColor}40`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // [ЧТО] Отрисовка объединённых зон покрытия с удалением пунктира в местах пересечения.
    // [ЗАЧЕМ] При пересечении зон покрытия пунктирная линия исчезает в месте пересечения,
    //          создавая эффект единой объединённой зоны вместо нескольких отдельных кругов.
    // [PLAN] 2.3.2 Наложение зон
    drawCoverageMerged(ctx, coverageMode = 'load') {
        // Собираем все активные объекты с зонами покрытия
        const coverageZones = [];
        this.map.forEach((hex, key) => {
            if (hex.object && (hex.object.mode === 'active' || hex.object.mode === 'economy')) {
                const center = this.hexToScreen(hex.q, hex.r);
                
                // Определение цвета
                let color = '#4a9eff';
                if (hex.object.type === 'Вышка') {
                    color = '#f59e0b';
                }
                if (hex.object.mode === 'economy') {
                    color = '#fbbf24';
                }
                
                const rangeMultiplier = hex.object.mode === 'economy' ? 0.5 : 1.0;
                const rangePixels = hex.object.range * this.hexSize * this.zoom * rangeMultiplier;
                
                coverageZones.push({
                    x: center.x,
                    y: center.y,
                    radius: rangePixels,
                    color: color
                });
            }
        });
        
        // Если нет зон покрытия, выходим
        if (coverageZones.length === 0) {
            return;
        }
        
        // Для каждой зоны рисуем контур, но пропускаем дуги внутри других зон
        coverageZones.forEach((zone, index) => {
            ctx.save();
            // Добавляем свечение для пунктирной линии
            ctx.shadowColor = zone.color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = `${zone.color}FF`; // Полная непрозрачность для яркости
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]); // Пунктирная линия
            
            // Проверяем каждую точку окружности на попадание в другие зоны
            const step = 2; // Шаг проверки в градусах (меньше = точнее, но медленнее)
            let isDrawing = false;
            let startAngle = 0;
            
            for (let angle = 0; angle <= 360; angle += step) {
                const rad = angle * Math.PI / 180;
                const testX = zone.x + zone.radius * Math.cos(rad);
                const testY = zone.y + zone.radius * Math.sin(rad);
                
                // Проверяем, находится ли точка внутри другой зоны
                let isInOtherZone = false;
                for (let j = 0; j < coverageZones.length; j++) {
                    if (j === index) continue;
                    const other = coverageZones[j];
                    const dist = Math.sqrt((testX - other.x) ** 2 + (testY - other.y) ** 2);
                    if (dist < other.radius) {
                        isInOtherZone = true;
                        break;
                    }
                }
                
                if (!isInOtherZone) {
                    if (!isDrawing) {
                        // Начинаем новую дугу
                        ctx.beginPath();
                        ctx.moveTo(zone.x + zone.radius * Math.cos(rad), zone.y + zone.radius * Math.sin(rad));
                        isDrawing = true;
                    } else {
                        // Продолжаем дугу
                        ctx.lineTo(zone.x + zone.radius * Math.cos(rad), zone.y + zone.radius * Math.sin(rad));
                    }
                } else {
                    if (isDrawing) {
                        // Заканчиваем дугу
                        ctx.stroke();
                        isDrawing = false;
                    }
                }
            }
            
            // Если остались незавершённые линии, завершаем их
            if (isDrawing) {
                ctx.stroke();
            }
            
            ctx.restore();
        });
    }

    // Проверка возможности размещения
    canPlace(q, r) {
        const key = this.getHexKey(q, r);
        const hex = this.map.get(key);
        if (!hex) return false;
        if (hex.obstacle) return false;
        if (hex.object) return false;
        return true;
    }

    // Размещение объекта
    placeObject(q, r, obj) {
        const key = this.getHexKey(q, r);
        const hex = this.map.get(key);
        if (hex && this.canPlace(q, r)) {
            hex.object = obj;
            return true;
        }
        return false;
    }

    // Удаление объекта
    removeObject(q, r) {
        const key = this.getHexKey(q, r);
        const hex = this.map.get(key);
        if (hex) {
            const obj = hex.object;
            hex.object = null;
            return obj;
        }
        return null;
    }

    // Получение гекса
    getHex(q, r) {
        return this.map.get(this.getHexKey(q, r));
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.grid = new HexGrid(6); // Уменьшенный размер гекса в 5 раз (было 30)
        
        // Ресурсы
        this.info = 100;
        this.energy = 50;
        this.infoRate = 0;
        this.energyRate = 0;
        
        // Время
        this.startTime = Date.now();
        this.gameTime = 0;
        this.speed = 1;
        this.paused = false;
        
        // Камера
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Выбранный объект
        this.selectedHex = null;
        
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Центрирование камеры
        this.grid.offsetX = this.canvas.width / 2;
        this.grid.offsetY = this.canvas.height / 2;
        
        // Инициализация карты (увеличено в 10 раз больше гексов)
        this.grid.initMap(47, 38); // Было (15, 12), увеличили примерно в sqrt(10) раз для каждой оси
        
        // Обработчики событий
        this.setupEventListeners();
        this.setupUI();
        
        // Запуск цикла
        this.lastUpdate = Date.now();
        this.loop();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 60;
    }

    setupEventListeners() {
        // Перетаскивание карты
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                
                // Клик по гексу
                const rect = this.canvas.getBoundingClientRect();
                const hex = this.grid.screenToHex(
                    e.clientX - rect.left,
                    e.clientY - rect.top
                );
                this.selectHex(hex.q, hex.r);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                this.grid.offsetX += dx;
                this.grid.offsetY += dy;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.grid.zoom = Math.max(0.5, Math.min(3, this.grid.zoom * zoomFactor));
        });

        // Контекстное меню (правый клик)
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    setupUI() {
        // Кнопки скорости
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

    selectHex(q, r) {
        const hex = this.grid.getHex(q, r);
        if (!hex) {
            this.closeContextPanel();
            return;
        }
        
        this.selectedHex = hex;
        this.showContextPanel(hex);
    }

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
            
            // Кнопки управления с подсказками
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
            // Кнопки постройки с подсказками
            buttons.innerHTML = `
                <button class="panel-btn btn-mode tooltip" data-tooltip="Базовый узел: радиус 5, потребление 2 энергии/с" onclick="game.buildRouter('${hex.q},${hex.r}')">Роутер (30)</button>
                <button class="panel-btn btn-mode tooltip" data-tooltip="Мощный узел: радиус 10, потребление 8 энергии/с" onclick="game.buildTower('${hex.q},${hex.r}')">Вышка (100)</button>
            `;
        }
        
        title.textContent = `Гекс [${hex.q}, ${hex.r}]`;
        content.innerHTML = info;
        panel.classList.add('visible');
    }

    closeContextPanel() {
        document.getElementById('context-panel').classList.remove('visible');
        this.selectedHex = null;
    }

    buildRouter(key) {
        const [q, r] = key.split(',').map(Number);
        if (this.info >= 30 && this.grid.canPlace(q, r)) {
            this.info -= 30;
            this.grid.placeObject(q, r, {
                type: 'Роутер',
                mode: 'inactive', // Не активный
                range: 5,
                energyCost: 2
            });
            this.updateUI();
            this.showContextPanel(this.grid.getHex(q, r));
        }
    }

    buildTower(key) {
        const [q, r] = key.split(',').map(Number);
        if (this.info >= 100 && this.grid.canPlace(q, r)) {
            this.info -= 100;
            this.grid.placeObject(q, r, {
                type: 'Вышка',
                mode: 'inactive', // Не активный
                range: 10,
                energyCost: 8
            });
            this.updateUI();
            this.showContextPanel(this.grid.getHex(q, r));
        }
    }

    toggleMode(key) {
        const [q, r] = key.split(',').map(Number);
        const hex = this.grid.getHex(q, r);
        if (hex && hex.object) {
            const modes = ['inactive', 'economy', 'active', 'blocked']; // Не активный, Экономный, Активный, Блокировка
            const currentIndex = modes.indexOf(hex.object.mode);
            hex.object.mode = modes[(currentIndex + 1) % modes.length];
            this.showContextPanel(hex);
        }
    }

    demolish(key) {
        const [q, r] = key.split(',').map(Number);
        const hex = this.grid.getHex(q, r);
        if (hex && hex.object) {
            const cost = hex.object.type === 'Роутер' ? 30 : 100;
            this.info += Math.floor(cost * 0.5);
            this.grid.removeObject(q, r);
            this.updateUI();
            this.showContextPanel(hex);
        }
    }

    updateUI() {
        document.getElementById('info-value').textContent = Math.floor(this.info);
        document.getElementById('energy-value').textContent = Math.floor(this.energy);
        document.getElementById('info-rate').textContent = `${this.infoRate >= 0 ? '+' : ''}${this.infoRate.toFixed(1)}/с`;
        document.getElementById('energy-rate').textContent = `${this.energyRate >= 0 ? '+' : ''}${this.energyRate.toFixed(1)}/с`;
        
        // Цвет индикаторов
        document.getElementById('info-rate').className = `resource-label ${this.infoRate >= 0 ? 'info-positive' : 'info-negative'}`;
        document.getElementById('energy-rate').className = `resource-label ${this.energyRate >= 0 ? 'info-positive' : 'info-negative'}`;
    }

    updateTimer(deltaTime) {
        if (!this.paused) {
            this.gameTime += deltaTime * this.speed;
        }
        
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateEconomy(deltaTime) {
        if (this.paused) return;
        
        // Подсчет потребления и дохода
        let energyConsumption = 0;
        let infoProduction = 0;
        
        this.grid.map.forEach(hex => {
            // Энергию потребляют только активные режимы (не заблокированные и не неактивные)
            if (hex.object && hex.object.mode === 'active') {
                energyConsumption += hex.object.energyCost;
                infoProduction += 1.0;
            } else if (hex.object && hex.object.mode === 'economy') {
                energyConsumption += hex.object.energyCost * 0.5; // Экономный режим потребляет меньше
                infoProduction += 0.5;
            }
            // blocked и inactive режимы не потребляют энергию и не производят информацию
        });
        
        // Пассивная генерация энергии (стартовый прирост + бонус от объектов)
        const baseEnergyProduction = 10; // Стартовый прирост энергии
        const activeObjects = Array.from(this.grid.map.values()).filter(h => h.object && h.object.mode === 'active').length;
        const economyObjects = Array.from(this.grid.map.values()).filter(h => h.object && h.object.mode === 'economy').length;
        const energyProduction = baseEnergyProduction + Math.floor((activeObjects + economyObjects * 0.5) / 10);
        
        this.energyRate = energyProduction - energyConsumption;
        this.infoRate = infoProduction;
        
        // Применение изменений
        const scaledDelta = deltaTime * this.speed;
        this.energy += (energyProduction - energyConsumption) * scaledDelta;
        this.info += infoProduction * scaledDelta;
        
        // Минимальные ограничения
        this.energy = Math.max(0, this.energy);
        this.info = Math.max(0, this.info);
        
        this.updateUI();
    }

    render() {
        // Очистка
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Отрисовка сетки
        this.grid.draw(this.ctx);
        
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

    loop() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;
        
        this.updateEconomy(deltaTime);
        this.updateTimer(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.loop());
    }
}

// Глобальные функции для UI
function closeContextPanel() {
    if (window.game) {
        window.game.closeContextPanel();
    }
}

// Инициализация игры при загрузке
window.addEventListener('load', () => {
    window.game = new Game();
});
