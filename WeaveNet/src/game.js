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
        });
        
        // Затем рисуем зоны покрытия всех объектов
        this.map.forEach((hex, key) => {
            if (hex.object) {
                const center = this.hexToScreen(hex.q, hex.r);
                this.drawCoverage(ctx, center.x, center.y, this.hexSize * this.zoom, hex.object);
            }
        });
        
        // Затем рисуем все объекты поверх зон покрытия
        this.map.forEach((hex, key) => {
            if (hex.object) {
                const center = this.hexToScreen(hex.q, hex.r);
                this.drawObjectIcon(ctx, center.x, center.y, this.hexSize * this.zoom, hex.object);
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

    // Draw object icon on hex (without coverage zone)
    drawObjectIcon(ctx, x, y, size, object) {
        // Define symbol and color based on object type
        let symbol = '📶'; // Router
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
        }
        
        // Рисуем символ объекта
        ctx.fillStyle = modeColor;
        ctx.font = `${size * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, x, y);
    }

    // Рисование зоны покрытия объекта
    drawCoverage(ctx, x, y, size, object) {
        // Рисуем зону покрытия только для активных режимов
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
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, rangePixels);
        gradient.addColorStop(0, `${modeColor}40`); // 25% прозрачности
        gradient.addColorStop(1, `${modeColor}00`); // полностью прозрачный
        
        ctx.beginPath();
        ctx.arc(x, y, rangePixels, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    // Старый метод (оставлен для совместимости)
    drawObject(ctx, x, y, size, object) {
        this.drawObjectIcon(ctx, x, y, size, object);
        this.drawCoverage(ctx, x, y, size, object);
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
        this.grid = new HexGrid(30);
        
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
        
        // Инициализация карты
        this.grid.initMap(15, 12);
        
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
                'active': '🟢 Активный'
            };
            info += `<div class="panel-row"><span>Объект:</span><span>${hex.object.type}</span></div>`;
            info += `<div class="panel-row"><span>Режим:</span><span>${modeNames[hex.object.mode] || hex.object.mode}</span></div>`;
            
            // Кнопки управления
            buttons.innerHTML = `
                <button class="panel-btn btn-mode" onclick="game.toggleMode('${hex.q},${hex.r}')">Сменить режим</button>
                <button class="panel-btn btn-demolish" onclick="game.demolish('${hex.q},${hex.r}')">Снести</button>
            `;
        } else if (!hex.obstacle) {
            // Кнопки постройки
            buttons.innerHTML = `
                <button class="panel-btn btn-mode" onclick="game.buildRouter('${hex.q},${hex.r}')">Роутер (30)</button>
                <button class="panel-btn btn-mode" onclick="game.buildTower('${hex.q},${hex.r}')">Вышка (100)</button>
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
            const modes = ['inactive', 'economy', 'active']; // Не активный, Экономный, Активный
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

    updateTimer() {
        if (!this.paused) {
            this.gameTime += (Date.now() - this.lastUpdate) / 1000 * this.speed;
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
            // Энергию потребляют только активные и экономные режимы
            if (hex.object && hex.object.mode !== 'inactive') {
                energyConsumption += hex.object.energyCost;
                
                // Бонус к информации за активные объекты
                if (hex.object.mode === 'economy') infoProduction += 0.5;
                if (hex.object.mode === 'active') infoProduction += 1.0;
            }
        });
        
        // Пассивная генерация энергии (стартовый прирост + бонус от объектов)
        const baseEnergyProduction = 10; // Стартовый прирост энергии
        const activeObjects = Array.from(this.grid.map.values()).filter(h => h.object && h.object.mode !== 'inactive').length;
        const energyProduction = baseEnergyProduction + Math.floor(activeObjects / 10);
        
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
        
        this.updateTimer();
        this.updateEconomy(deltaTime);
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
