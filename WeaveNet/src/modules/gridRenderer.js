/**
 * @fileoverview Модуль отрисовки гексагональной сетки и объектов
 * [ЧТО] Класс для рендеринга карты, гексов, объектов и зон покрытия на canvas.
 * [ЗАЧЕМ] Инкапсулирует всю графику игры: послойную отрисовку, интерполяцию цветов, объединение зон.
 * [PLAN] 2.3. Визуализация покрытия, 6.3. Навигация по карте
 */

class GridRenderer {
    /**
     * [ЧТО] Конструктор рендерера с привязкой к HexGrid.
     * [ЗАЧЕМ] Получает ссылку на сетку для доступа к данным карты и параметрам камеры.
     * @param {HexGrid} hexGrid - Ссылка на экземпляр HexGrid
     */
    constructor(hexGrid) {
        this.grid = hexGrid;
        // [ЧТО] Кэш для объединённых путей зон покрытия.
        // [ЗАЧЕМ] Оптимизация производительности при отрисовке пересекающихся зон.
        this.coverageCache = null;
        this.coverageCacheValid = false;
    }

    /**
     * [ЧТО] Основной метод отрисовки всей сетки с объектами и зонами.
     * [ЗАЧЕМ] Обеспечивает правильный порядок слоёв: гексы → зоны (контуром) → объекты.
     * [PLAN] 2.3. Визуализация покрытия
     * @param {CanvasRenderingContext2D} ctx - Контекст рисования canvas
     */
    draw(ctx) {
        ctx.save();
        
        // Слой 1: Все гексы
        this.grid.map.forEach((hex, key) => {
            const center = this.grid.hexToScreen(hex.q, hex.r);
            
            // Цвет местности
            let color = '#4ade80'; // plain - зеленый
            if (hex.terrain === 'desert') color = '#fbbf24'; // пустыня - песочный
            if (hex.terrain === 'snow') color = '#f3f4f6'; // снег - белый
            
            this.drawHex(ctx, center.x, center.y, this.grid.hexSize * this.grid.zoom, color, hex.obstacle);
            
            // Объекты рисуем позже, после зон покрытия
        });
        
        // Слой 2: Зоны покрытия (только контуры в режиме 'load')
        this.drawCoverageMerged(ctx, 'load');
        
        // Слой 3: Объекты поверх зон покрытия
        this.grid.map.forEach((hex, key) => {
            if (hex.object) {
                const center = this.grid.hexToScreen(hex.q, hex.r);
                this.drawObject(ctx, center.x, center.y, this.grid.hexSize * this.grid.zoom, hex.object);
            }
        });
        
        ctx.restore();
    }

    /**
     * [ЧТО] Отрисовка одного гекса с обводкой и индикатором преграды.
     * [ЗАЧЕМ] Базовый строительный блок карты с визуальным обозначением препятствий.
     * @param {CanvasRenderingContext2D} ctx - Контекст рисования
     * @param {number} x - X координата центра
     * @param {number} y - Y координата центра
     * @param {number} size - Размер гекса
     * @param {string} color - Цвет заполнения
     * @param {string|null} obstacle - Тип преграды или null
     */
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
        
        // Индикатор преграды символом
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

    /**
     * [ЧТО] Отрисовка объекта (роутер/вышка) с плавной интерполяцией цвета режима.
     * [ЗАЧЕМ] Плавный переход цвета вместо резкого скачка улучшает визуальное восприятие.
     * [PLAN] 2.2. Режимы работы
     * @param {CanvasRenderingContext2D} ctx - Контекст рисования
     * @param {number} x - X координата центра
     * @param {number} y - Y координата центра
     * @param {number} size - Размер для масштабирования символа
     * @param {Object} object - Данные объекта с типом и режимом
     */
    drawObject(ctx, x, y, size, object) {
        // Определение символа и базового цвета по типу
        let symbol = '📶';
        let baseColor = '#4a9eff';
        if (object.type === 'Роутер') {
            symbol = '📶';
            baseColor = '#4a9eff';
        } else if (object.type === 'Вышка') {
            symbol = '🗼';
            baseColor = '#f59e0b';
        }
        
        // Целевой цвет по режиму
        let targetColor = baseColor;
        if (object.mode === 'inactive') {
            targetColor = '#9ca3af'; // серый
        } else if (object.mode === 'economy') {
            targetColor = '#fbbf24'; // желтый
        } else if (object.mode === 'active') {
            targetColor = baseColor;
        } else if (object.mode === 'blocked') {
            targetColor = '#ef4444'; // красный
        }
        
        // Инициализация текущего цвета
        if (!object.currentColor) {
            object.currentColor = targetColor;
        }
        
        // Плавная интерполяция (lerp)
        object.currentColor = this.interpolateColor(object.currentColor, targetColor, 0.1);
        
        // Отрисовка символа
        ctx.fillStyle = object.currentColor;
        ctx.font = `${size * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, x, y);
    }
    
    /**
     * [ЧТО] Линейная интерполяция между двумя HEX цветами.
     * [ЗАЧЕМ] Позволяет плавно анимировать переход цвета объекта между режимами.
     * @param {string} color1 - Начальный цвет (HEX)
     * @param {string} color2 - Конечный цвет (HEX)
     * @param {number} t - Коэффициент интерполяции (0..1)
     * @returns {string} Интерполированный цвет (HEX)
     */
    interpolateColor(color1, color2, t) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    /**
     * [ЧТО] Отрисовка объединённых зон покрытия с удалением пунктира в местах пересечения.
     * [ЗАЧЕМ] Создаёт эффект единой зоны покрытия вместо набора отдельных кругов.
     * [PLAN] 2.3. Визуализация покрытия
     * @param {CanvasRenderingContext2D} ctx - Контекст рисования
     * @param {string} coverageMode - Режим отрисовки ('load' для контура)
     */
    drawCoverageMerged(ctx, coverageMode = 'load') {
        // Кэш отключён из-за движения камеры (offsetX/offsetY меняются)
        const useCache = false;

        if (useCache && this.coverageCache && this.coverageCacheValid) {
            this.coverageCache.forEach((zone, index) => {
                ctx.save();
                ctx.shadowColor = zone.color;
                ctx.shadowBlur = 10;
                ctx.strokeStyle = `${zone.color}FF`;
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);

                zone.paths.forEach(path => {
                    ctx.beginPath();
                    path.forEach((point, i) => {
                        if (i === 0) ctx.moveTo(point.x, point.y);
                        else ctx.lineTo(point.x, point.y);
                    });
                    ctx.stroke();
                });

                ctx.restore();
            });
            return;
        }

        // Сбор всех активных зон покрытия
        const coverageZones = [];
        this.grid.map.forEach((hex, key) => {
            if (hex.object && (hex.object.mode === 'active' || hex.object.mode === 'economy')) {
                const center = this.grid.hexToScreen(hex.q, hex.r);

                let color = '#4a9eff';
                if (hex.object.type === 'Вышка') {
                    color = '#f59e0b';
                }
                if (hex.object.mode === 'economy') {
                    color = '#fbbf24';
                }

                const rangeMultiplier = hex.object.mode === 'economy' ? 0.5 : 1.0;
                const rangePixels = hex.object.range * this.grid.hexSize * this.grid.zoom * rangeMultiplier;

                coverageZones.push({
                    x: center.x,
                    y: center.y,
                    radius: rangePixels,
                    color: color
                });
            }
        });

        if (coverageZones.length === 0) return;

        const cacheData = [];

        // Отрисовка каждой зоны с проверкой пересечений
        coverageZones.forEach((zone, index) => {
            ctx.save();
            ctx.shadowColor = zone.color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = `${zone.color}FF`;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);

            const step = 2; // Шаг проверки в градусах
            let isDrawing = false;
            let currentPath = [];

            for (let angle = 0; angle <= 360; angle += step) {
                const rad = angle * Math.PI / 180;
                const testX = zone.x + zone.radius * Math.cos(rad);
                const testY = zone.y + zone.radius * Math.sin(rad);

                // Проверка попадания точки в другую зону
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
                        ctx.beginPath();
                        ctx.moveTo(zone.x + zone.radius * Math.cos(rad), zone.y + zone.radius * Math.sin(rad));
                        currentPath = [{x: zone.x + zone.radius * Math.cos(rad), y: zone.y + zone.radius * Math.sin(rad)}];
                        isDrawing = true;
                    } else {
                        ctx.lineTo(zone.x + zone.radius * Math.cos(rad), zone.y + zone.radius * Math.sin(rad));
                        currentPath.push({x: zone.x + zone.radius * Math.cos(rad), y: zone.y + zone.radius * Math.sin(rad)});
                    }
                } else {
                    if (isDrawing) {
                        ctx.stroke();
                        if (currentPath.length > 0) {
                            if (!cacheData[index]) cacheData[index] = {color: zone.color, paths: []};
                            cacheData[index].paths.push([...currentPath]);
                        }
                        isDrawing = false;
                        currentPath = [];
                    }
                }
            }

            if (isDrawing) {
                ctx.stroke();
                if (currentPath.length > 0) {
                    if (!cacheData[index]) cacheData[index] = {color: zone.color, paths: []};
                    cacheData[index].paths.push([...currentPath]);
                }
            }

            ctx.restore();
        });

        this.coverageCache = cacheData;
        this.coverageCacheValid = true;
    }

    /**
     * [ЧТО] Инвалидация кэша зон покрытия.
     * [ЗАЧЕМ] Вызывается при движении камеры или изменении сети для перерисовки зон.
     */
    invalidateCoverageCache() {
        this.coverageCacheValid = false;
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridRenderer;
}
