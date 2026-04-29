// WeaveNet - Свободный Сигнал
// Основная игровая логика

class HexGrid {
    constructor(hexSize = 15) {
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

    // Инициализация карты с формой похожей на Россию
    // [ЧТО] Генерация гексагональной карты с очертаниями, напоминающими территорию России.
    // [ЗАЧЕМ] Визуальная схожесть с реальной картой России улучшает погружение и соответствует плану.
    // [PLAN] 1.4. Схожесть карты на реальную карту
    // [USER] Измени принцип генерации карты, пусть гексы будут меньше и карта детальнее
    initMap(width = 40, height = 30) {
        for (let q = -width; q <= width; q++) {
            for (let r = -height; r <= height; r++) {
                if (Math.abs(q + r) <= Math.max(width, height)) {
                    const key = this.getHexKey(q, r);
                    
                    // [ЧТО] Проверка формы карты для создания очертаний похожих на Россию.
                    // [ЗАЧЕМ] Исключаем гексы за пределами "российской" формы карты.
                    // [ERROR] Ошибка 2 - карта должна быть похожа на Россию
                    if (!this.isInRussiaShape(q, r, width, height)) {
                        continue; // Пропускаем гексы вне формы России
                    }
                    
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
    
    // [ЧТО] Проверка принадлежности гекса к форме "Россия".
    // [ЗАЧЕМ] Создаёт очертания карты, визуально похожие на территорию России с узнаваемыми географическими элементами.
    // [ERROR] Ошибка 2 - карта должна быть похожа на Россию. Улучшена форма с добавлением Крыма, Камчатки и Сахалина.
    // [PLAN] 1.4. Схожесть карты на реальную карту
    isInRussiaShape(q, r, width, height) {
        // Улучшенная модель формы России с более узнаваемыми очертаниями
        // Россия вытянута с запада на восток (горизонтально) и имеет характерные изгибы
        
        // Нормализованные координаты (-1 до 1)
        const normQ = q / width;
        const normR = r / height;
        
        // Западная часть (Европа) - более широкая, с Калининградским выступом и Крымом
        if (normQ < -0.4) {
            // Европейская часть: широкая, с небольшим расширением на севере (Кольский полуостров)
            const maxR = 0.65 + Math.sin((normQ + 0.4) * Math.PI) * 0.15;
            // Добавляем Крым в юго-западной части (характерный полуостров на юге)
            if (normQ > -0.7 && normQ < -0.5 && normR < -0.3 && normR > -0.6) {
                return true; // Крым всегда включаем
            }
            return Math.abs(normR) < maxR;
        }
        
        // Центральная часть (Урал и Западная Сибирь) - переходная зона
        if (normQ >= -0.4 && normQ < -0.1) {
            // Сужение после европейской части, затем расширение
            const maxR = 0.55 + Math.sin((normQ + 0.4) * Math.PI * 2) * 0.1;
            return Math.abs(normR) < maxR;
        }
        
        // Сибирь - длинная вытянутая часть с северным побережьем
        if (normQ >= -0.1 && normQ < 0.4) {
            // Северное побережье более выражено (положительный R), юг более прямой
            const northLimit = 0.5 + Math.sin((normQ + 0.1) * Math.PI) * 0.2;
            const southLimit = 0.35 + Math.cos((normQ + 0.1) * Math.PI) * 0.1;
            return normR < northLimit && normR > -southLimit;
        }
        
        // Восточная Сибирь и Дальний Восток - сужается с изгибом на юг
        if (normQ >= 0.4 && normQ < 0.7) {
            // Характерный изгиб на юг (Амур, Приморье)
            const northLimit = 0.45 - (normQ - 0.4) * 0.3;
            const southLimit = 0.3 + (normQ - 0.4) * 0.5; // Смещение на юг
            return normR < northLimit && normR > -southLimit;
        }
        
        // Дальневосточный конец (Камчатка, Чукотка) - узкий полуостров
        if (normQ >= 0.7) {
            // Очень узкая часть с окончанием
            const maxR = 0.25 - (normQ - 0.7) * 0.5;
            if (maxR <= 0) return false;
            return Math.abs(normR) < maxR;
        }
        
        return true;
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

    // Рисование объекта на гексе с плавным переходом цвета
    // [ЧТО] Метод отрисовки объектов с интерполяцией цвета при смене режима.
    // [ЗАЧЕМ] Плавное изменение цвета вместо резкого скачка улучшает визуальное восприятие.
    //          Игрок видит постепенный переход между состояниями здания.
    // [TODO] 3. Сгладить переходы между режимами строений (плавное изменение цвета)
    drawObject(ctx, x, y, size, object) {
        // Определение символа и базового цвета в зависимости от типа объекта
        let symbol = '📶'; // Роутер
        let baseColor = '#4a9eff';
        if (object.type === 'Роутер') {
            symbol = '📶'; // Router
            baseColor = '#4a9eff';
        } else if (object.type === 'Вышка') {
            symbol = '🗼'; // Tower
            baseColor = '#f59e0b';
        }
        
        // Определение целевого цвета в зависимости от режима
        let targetColor = baseColor;
        if (object.mode === 'inactive') {
            targetColor = '#9ca3af'; // gray for inactive
        } else if (object.mode === 'economy') {
            targetColor = '#fbbf24'; // yellow for economy
        } else if (object.mode === 'active') {
            targetColor = baseColor; // original color for active
        } else if (object.mode === 'blocked') {
            targetColor = '#ef4444'; // red for blocked
        }
        
        // Инициализация текущего цвета для интерполяции если нет
        if (!object.currentColor) {
            object.currentColor = targetColor;
        }
        
        // Плавная интерполяция текущего цвета к целевому (lerp)
        object.currentColor = this.interpolateColor(object.currentColor, targetColor, 0.1);
        
        // Рисуем символ объекта с текущим (интерполированным) цветом
        ctx.fillStyle = object.currentColor;
        ctx.font = `${size * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, x, y);
    }
    
    // [ЧТО] Интерполяция между двумя HEX цветами с коэффициентом t.
    // [ЗАЧЕМ] Позволяет плавно изменять цвет объекта от одного оттенка к другому.
    //          Используется для визуального сглаживания переходов между режимами.
    // [TODO] 3. Сгладить переходы между режимами строений
    interpolateColor(color1, color2, t) {
        // Парсинг HEX цветов
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        // Линейная интерполяция RGB компонентов
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        // Возврат в HEX формат
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
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
    // [ERROR] Ошибка 1 - при движение карты зона покрытия не двигается. Кэш содержит экранные координаты,
    //          которые устаревают при движении камеры. Нужно отключить кэш или пересчитывать его.
    // [PLAN] 2.3.2 Наложение зон
    drawCoverageMerged(ctx, coverageMode = 'load') {
        // [ЧТО] Отключаем использование кэша так как он содержит экранные координаты.
        // [ЗАЧЕМ] При движении камеры (offsetX/offsetY) экранные координаты зон меняются,
        //          поэтому кэш всегда невалиден и нужно пересчитывать зоны каждый кадр.
        // [ERROR] Ошибка 1 - зоны покрытия не двигались при перетаскивании карты
        const useCache = false; // Кэш отключён для корректного отображения при движении
        
        if (useCache && this.coverageCache && this.coverageCacheValid) {
            // Рисуем из кэша
            this.coverageCache.forEach((zone, index) => {
                ctx.save();
                ctx.shadowColor = zone.color;
                ctx.shadowBlur = 10;
                ctx.strokeStyle = `${zone.color}FF`;
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                
                // Рисуем сохранённые пути из кэша
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
        
        // Кэш для хранения путей
        const cacheData = [];
        
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
            let currentPath = [];
            
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
                        currentPath = [{x: zone.x + zone.radius * Math.cos(rad), y: zone.y + zone.radius * Math.sin(rad)}];
                        isDrawing = true;
                    } else {
                        // Продолжаем дугу
                        ctx.lineTo(zone.x + zone.radius * Math.cos(rad), zone.y + zone.radius * Math.sin(rad));
                        currentPath.push({x: zone.x + zone.radius * Math.cos(rad), y: zone.y + zone.radius * Math.sin(rad)});
                    }
                } else {
                    if (isDrawing) {
                        // Заканчиваем дугу
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
            
            // Если остались незавершённые линии, завершаем их
            if (isDrawing) {
                ctx.stroke();
                if (currentPath.length > 0) {
                    if (!cacheData[index]) cacheData[index] = {color: zone.color, paths: []};
                    cacheData[index].paths.push([...currentPath]);
                }
            }
            
            ctx.restore();
        });
        
        // Сохраняем кэш
        this.coverageCache = cacheData;
        this.coverageCacheValid = true;
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
    // [ЧТО] Кэширование расчетных данных покрытия для повышения FPS.
    // [ЗАЧЕМ] Вместо пересчета зон покрытия каждый кадр, кэшируем результаты
    //          и обновляем только при изменении состояния объектов.
    // [TODO] 7. Добавить кэширование расчетных данных покрытия для повышения FPS
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.grid = new HexGrid(15); // Уменьшенный размер гекса для более детальной карты (было 30)
        
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
        
        // Кэш зон покрытия для оптимизации
        this.coverageCache = null;
        this.coverageCacheValid = false;
        
        // [ЧТО] Таймер и интервал для автосохранения каждые 5 минут.
        // [ЗАЧЕМ] Сохраняет прогресс игрока автоматически, предотвращая потерю данных при закрытии браузера.
        //          Интервал 5 минут выбран как баланс между частотой сохранений и производительностью.
        // [TODO] 8. Реализовать автосохранение каждые 5 минут игры
        this.autoSaveInterval = 300; // 5 минут в секундах
        this.autoSaveTimer = 0;
        this.lastSaveTime = 0;
        
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
        
        // Попытка загрузки сохраненной игры
        this.loadGame();
        
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
                // [ЧТО] Инвалидация кэша зон покрытия при движении карты.
                // [ЗАЧЕМ] Зоны покрытия должны перерисовываться при изменении позиции камеры,
                //          так как их экранные координаты зависят от offsetX/offsetY.
                // [ERROR] Ошибка 1 - при движение карты зона покрытия не двигается
                this.coverageCacheValid = false;
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
            // Инвалидация кэша покрытия при изменении сети
            this.coverageCacheValid = false;
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
            // Инвалидация кэша покрытия при изменении сети
            this.coverageCacheValid = false;
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
            // Инвалидация кэша покрытия при смене режима
            this.coverageCacheValid = false;
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
            // Инвалидация кэша покрытия при удалении объекта
            this.coverageCacheValid = false;
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
        
        // [ЧТО] Обновление таймера автосохранения и выполнение сохранения каждые 5 минут.
        // [ЗАЧЕМ] Автоматически сохраняет прогресс игрока в localStorage для предотвращения потери данных.
        //          Сохранение включает ресурсы, время игры и состояние всех гексов с объектами.
        // [TODO] 8. Реализовать автосохранение каждые 5 минут игры
        this.autoSaveTimer += deltaTime * this.speed;
        if (this.autoSaveTimer >= this.autoSaveInterval) {
            this.autoSave();
            this.autoSaveTimer = 0;
        }
        
        this.updateUI();
    }
    
    // [ЧТО] Метод автосохранения состояния игры в localStorage.
    // [ЗАЧЕМ] Сохраняет все важные данные игры: ресурсы, время, позицию камеры, зум и состояние карты.
    //          Позволяет игроку возобновить игру после перезагрузки страницы.
    // [TODO] 8. Реализовать автосохранение каждые 5 минут игры
    autoSave() {
        const gameState = {
            info: this.info,
            energy: this.energy,
            gameTime: this.gameTime,
            offsetX: this.grid.offsetX,
            offsetY: this.grid.offsetY,
            zoom: this.grid.zoom,
            mapState: []
        };
        
        // Сохраняем только гексы с объектами для экономии места
        this.grid.map.forEach((hex, key) => {
            if (hex.object) {
                gameState.mapState.push({
                    key: key,
                    object: hex.object
                });
            }
        });
        
        try {
            localStorage.setItem('weaveNetSave', JSON.stringify(gameState));
            console.log('[AutoSave] Игра сохранена успешно');
        } catch (e) {
            console.error('[AutoSave] Ошибка сохранения:', e);
        }
    }
    
    // [ЧТО] Метод загрузки сохраненного состояния игры из localStorage.
    // [ЗАЧЕМ] Восстанавливает прогресс игрока после перезагрузки страницы или при запуске игры.
    //          Обрабатывает возможные ошибки при чтении поврежденных данных.
    // [TODO] 9. Добавить обработку ошибок при загрузке сохраненной конфигурации
    loadGame() {
        try {
            const savedData = localStorage.getItem('weaveNetSave');
            if (!savedData) {
                console.log('[LoadGame] Нет сохраненных данных');
                return false;
            }
            
            const gameState = JSON.parse(savedData);
            
            // Восстановление ресурсов
            this.info = gameState.info || 100;
            this.energy = gameState.energy || 50;
            this.gameTime = gameState.gameTime || 0;
            
            // Восстановление камеры
            this.grid.offsetX = gameState.offsetX || this.canvas.width / 2;
            this.grid.offsetY = gameState.offsetY || this.canvas.height / 2;
            this.grid.zoom = gameState.zoom || 1;
            
            // Восстановление объектов на карте
            if (gameState.mapState && Array.isArray(gameState.mapState)) {
                // Очищаем существующие объекты
                this.grid.map.forEach(hex => {
                    hex.object = null;
                });
                
                // Восстанавливаем объекты из сохранения
                gameState.mapState.forEach(savedHex => {
                    const [q, r] = savedHex.key.split(',').map(Number);
                    const hex = this.grid.getHex(q, r);
                    if (hex) {
                        hex.object = savedHex.object;
                    }
                });
            }
            
            // Инвалидация кэша покрытия после загрузки
            this.coverageCacheValid = false;
            
            console.log('[LoadGame] Игра загружена успешно');
            this.updateUI();
            return true;
        } catch (e) {
            console.error('[LoadGame] Ошибка загрузки:', e);
            // При ошибке загрузки игра продолжается с текущим состоянием
            return false;
        }
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
    
    // [ЧТО] Оптимизированный метод отрисовки только видимой области карты.
    // [ЗАЧЕМ] При большом зуме нет необходимости рисовать гексы за пределами экрана.
    //          Это значительно повышает FPS при работе с большими картами.
    // [TODO] 6. Оптимизировать отрисовку гексагональной сетки при большом зуме
    renderOptimized() {
        // Очистка
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Вычисляем видимую область в гексагональных координатах
        const margin = 2; // Дополнительный запас гексов по краям
        const viewWidth = (this.canvas.width / this.grid.zoom) / this.grid.hexSize;
        const viewHeight = (this.canvas.height / this.grid.zoom) / this.grid.hexSize;
        
        const centerX = (-this.grid.offsetX + this.canvas.width / 2) / (this.grid.zoom * this.grid.hexSize);
        const centerY = (-this.grid.offsetY + this.canvas.height / 2) / (this.grid.zoom * this.grid.hexSize);
        
        const minQ = Math.floor(centerX - viewWidth / 2 - margin);
        const maxQ = Math.ceil(centerX + viewWidth / 2 + margin);
        const minR = Math.floor(centerY - viewHeight / 2 - margin);
        const maxR = Math.ceil(centerY + viewHeight / 2 + margin);
        
        // Рисуем только видимые гексы
        this.grid.map.forEach((hex, key) => {
            if (hex.q >= minQ && hex.q <= maxQ && hex.r >= minR && hex.r <= maxR) {
                const center = this.grid.hexToScreen(hex.q, hex.r);
                
                // Проверяем, находится ли гекс в пределах экрана
                if (center.x > -this.grid.hexSize * this.grid.zoom && 
                    center.x < this.canvas.width + this.grid.hexSize * this.grid.zoom &&
                    center.y > -this.grid.hexSize * this.grid.zoom && 
                    center.y < this.canvas.height + this.grid.hexSize * this.grid.zoom) {
                    
                    // Цвет местности
                    let color = '#4ade80';
                    if (hex.terrain === 'desert') color = '#fbbf24';
                    if (hex.terrain === 'snow') color = '#f3f4f6';
                    
                    this.grid.drawHex(this.ctx, center.x, center.y, this.grid.hexSize * this.grid.zoom, color, hex.obstacle);
                    
                    if (hex.object) {
                        this.grid.drawObject(this.ctx, center.x, center.y, this.grid.hexSize * this.grid.zoom, hex.object);
                    }
                }
            }
        });
        
        // Отрисовка зон покрытия
        this.grid.drawCoverageMerged(this.ctx, 'load');
        
        // Отрисовка объектов поверх зон
        this.grid.map.forEach((hex, key) => {
            if (hex.q >= minQ && hex.q <= maxQ && hex.r >= minR && hex.r <= maxR && hex.object) {
                const center = this.grid.hexToScreen(hex.q, hex.r);
                if (center.x > -this.grid.hexSize * this.grid.zoom && 
                    center.x < this.canvas.width + this.grid.hexSize * this.grid.zoom &&
                    center.y > -this.grid.hexSize * this.grid.zoom && 
                    center.y < this.canvas.height + this.grid.hexSize * this.grid.zoom) {
                    this.grid.drawObject(this.ctx, center.x, center.y, this.grid.hexSize * this.grid.zoom, hex.object);
                }
            }
        });
        
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
        // Используем оптимизированную отрисовку для повышения FPS
        this.renderOptimized();
        
        requestAnimationFrame(() => this.loop());
    }
}

// Глобальные функции для UI
function closeContextPanel() {
    if (window.game) {
        window.game.closeContextPanel();
    }
}

// [ЧТО] Функция сброса прогресса игры с подтверждением от пользователя.
// [ЗАЧЕМ] Позволяет игроку полностью очистить сохранение и начать игру заново с начальными параметрами.
//          Удаляет данные из localStorage и перезагружает страницу для применения изменений.
// [PLAN] Пользовательский запрос - кнопка сброса прогресса
function resetGameProgress() {
    if (confirm('⚠️ Вы уверены, что хотите сбросить весь прогресс игры?\n\nЭто действие необратимо:\n• Все ресурсы будут потеряны\n• Все постройки будут удалены\n• Время игры будет сброшено\n\nВы хотите продолжить?')) {
        try {
            localStorage.removeItem('weaveNetSave');
            console.log('[ResetProgress] Прогресс сброшен');
            location.reload(); // Перезагрузка страницы для применения сброса
        } catch (e) {
            console.error('[ResetProgress] Ошибка при сбросе:', e);
            alert('❌ Произошла ошибка при сбросе прогресса. Попробуйте вручную очистить данные браузера.');
        }
    }
}

// Инициализация игры при загрузке
window.addEventListener('load', () => {
    window.game = new Game();
    
    // Добавляем обработчик на кнопку сброса прогресса
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetGameProgress);
    }
});
