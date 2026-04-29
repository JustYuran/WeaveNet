/**
 * HexGrid - Модуль управления гексагональной сеткой
 * [ЧТО] Создаёт поле размером 200×200 гексов со случайно генерируемой формой континента
 * [ЗАЧЕМ] Большая карта для масштабного геймплея с уникальной конфигурацией каждый запуск
 * [PLAN] В будущем можно добавить настройку размера карты и параметров генерации
 * 
 * [ERROR] Ошибка 1 - карта генерируется неправильно, часть пропадает при движении -> ИСПРАВЛЕНО
 * [PLAN] Реализована поддержка больших карт с координатной системой
 */

class HexGrid {
    /**
     * Конструктор гексагональной сетки
     * @param {number} hexSize - Размер одного гекса (радиус описанной окружности)
     * @param {number} mapSize - Размер карты (200 для 200×200)
     */
    constructor(hexSize = 60, mapSize = 200) {
        // [ЧТО] Базовые параметры сетки
        // [ЗАЧЕМ] Определяют геометрию и размеры всех гексов
        // [PLAN] Добавить настройку через конфиг в будущем
        this.hexSize = hexSize;
        this.mapSize = mapSize; // Размер карты (200×200)
        this.hexes = []; // Массив всех гексов на поле
        this.centerHex = null; // Центральный гекс
        this.hexMap = new Map(); // Быстрый поиск гексов по координатам "q,r"
        
        // [ЧТО] Вычисляем высоту и ширину гекса для правильного позиционирования
        // [ЗАЧЕМ] Для корректной отрисовки соседних гексов без зазоров
        // [PLAN] Вынести в утилиты для переиспользования
        this.hexWidth = Math.sqrt(3) * hexSize;
        this.hexHeight = 2 * hexSize;
        
        // [ЧТО] Инициализируем сетку
        // [ЗАЧЕМ] Создаём игровое поле при старте
        // [PLAN] Добавить поддержку разных размеров карт
        this.generateHexGrid();
    }
    
    /**
     * Генерация сетки размером 200×200 со случайной формой континента
     * [ЧТО] Создаёт массив гексов с координатами и связями
     * [ЗАЧЕМ] Формирует игровое поле для размещения построек
     * [PLAN] Добавить типы местности для каждого гекса
     */
    generateHexGrid() {
        this.hexes = [];
        this.hexMap.clear();
        let hexId = 0;
        
        // [ЧТО] Определяем границы карты в axial-координатах
        // [ЗАЧЕМ] Ограничиваем размер карты 200×200
        // [PLAN] Реализовать форму России через маску территорий
        const halfSize = Math.floor(this.mapSize / 2);
        
        // [ЧТО] Генерируем гексы в диапазоне координат
        // [ЗАЧЕМ] Создаём прямоугольную область 200×200
        // [PLAN] Применить маску формы России
        for (let q = -halfSize; q < halfSize; q++) {
            for (let r = -halfSize; r < halfSize; r++) {
                // [ЧТО] Проверяем попадает ли гекс в процедурно сгенерированную форму континента
                // [ЗАЧЕМ] Создаём уникальную карту каждый запуск
                // [PLAN] Добавить параметры генерации (размер, изрезанность)
                if (this.generateContinentShape(q, r, halfSize)) {
                    const hex = this.createHex(q, r, hexId++);
                    this.hexes.push(hex);
                    this.hexMap.set(`${q},${r}`, hex);
                    
                    // [ЧТО] Запоминаем центральный гекс
                    // [ЗАЧЕМ] Точка отсчёта для камеры и интерфейса
                    if (q === 0 && r === 0) {
                        this.centerHex = hex;
                    }
                }
            }
        }
        
        // [ЧТО] Устанавливаем связи между соседями
        // [ЗАЧЕМ] Для навигации и логики игры
        this.setupNeighbors();
        
        console.log(`[HexGrid] Создано ${this.hexes.length} гексов (карта ${this.mapSize}×${this.mapSize} со случайной генерацией континента)`);
    }
    
    /**
     * Генерация процедурной формы континента
     * [ЧТО] Создание случайных очертаний континента с уникальной конфигурацией
     * [ЗАЧЕМ] Уникальная карта каждый запуск игры для разнообразия геймплея
     * [PLAN] Добавить параметры генерации (размер, изрезанность, количество островов)
     */
    generateContinentShape(q, r, halfSize) {
        // [ЧТО] Процедурная генерация формы континента
        // [ЗАЧЕМ] Случайная карта вместо фиксированной формы России
        // [PLAN] Реализовать через шум Перлина или клеточный автомат
        
        // Базовая эллиптическая форма с вариациями
        const aspectRatio = 1.8; // Пропорции континента
        const baseRadiusQ = halfSize;
        const baseRadiusR = Math.floor(halfSize / aspectRatio);
        
        // Добавляем случайные вариации к границам
        const noise = Math.sin(q * 0.1) * Math.cos(r * 0.1) * 5 + 
                      Math.sin(q * 0.3 + r * 0.2) * 3;
        
        const effectiveRadiusR = baseRadiusR + noise;
        
        // Проверка попадания в эллипс с вариациями
        const normalizedQ = q / baseRadiusQ;
        const normalizedR = r / effectiveRadiusR;
        const distance = Math.sqrt(normalizedQ * normalizedQ + normalizedR * normalizedR);
        
        if (distance > 1.0) {
            return false;
        }
        
        // Добавляем случайные полуострова и заливы по краям
        if (distance > 0.7 && distance < 0.95) {
            // 20% шанс создать залив/полуостров
            if (Math.random() > 0.8) {
                return !this.isCoastalFeature(q, r, halfSize);
            }
        }
        
        // Случайные острова вокруг континента
        if (distance >= 0.95 && distance < 1.3) {
            return Math.random() > 0.7; // 30% островов
        }
        
        return true;
    }
    
    /**
     * Проверка прибрежных особенностей (заливы/полуострова)
     */
    isCoastalFeature(q, r, halfSize) {
        // [ЧТО] Создание заливов и полуостровов
        // [ЗАЧЕМ] Более интересная береговая линия
        const angle = Math.atan2(r, q);
        const featureNoise = Math.sin(angle * 8) * 0.1;
        return featureNoise > 0;
    }
    
    /**
     * Установка связей между соседними гексами
     * [ЧТО] Проходит по всем гексам и устанавливает ссылки на соседей
     * [ЗАЧЕМ] Двусторонняя связь для навигации между гексами
     * [PLAN] Оптимизировать алгоритм для больших карт
     */
    setupNeighbors() {
        const dq = [1, 0, -1, -1, 0, 1];
        const dr = [0, 1, 1, 0, -1, -1];
        
        // [ЧТО] Используем this.hexMap для быстрого поиска гексов по координатам
        // [ЗАЧЕМ] Эффективный поиск соседей без повторного создания Map
        // [PLAN] Оптимизировать для огромных карт
        
        // [ЧТО] Для каждого гекса находим 6 возможных соседей
        // [ЗАЧЕМ] Устанавливаем двусторонние связи
        this.hexes.forEach(hex => {
            for (let dir = 0; dir < 6; dir++) {
                const neighborQ = hex.q + dq[dir];
                const neighborR = hex.r + dr[dir];
                const neighbor = this.hexMap.get(`${neighborQ},${neighborR}`);
                
                if (neighbor) {
                    hex.neighbors[dir] = neighbor;
                }
            }
        });
    }
    
    /**
     * Получение гекса по axial-координатам
     * @param {number} q - Axial-координата q
     * @param {number} r - Axial-координата r
     * @returns {Object|null} Объект гекса или null если не найден
     */
    getHexByCoords(q, r) {
        // [ЧТО] Быстрый поиск гекса через Map
        // [ЗАЧЕМ] Эффективный доступ к гексам по координатам
        // [PLAN] Использовать в pathfinding и других системах
        return this.hexMap.get(`${q},${r}`) || null;
    }
    
    /**
     * Создание объекта гекса
     * @param {number} q - Axial-координата q
     * @param {number} r - Axial-координата r
     * @param {number} id - Уникальный идентификатор гекса
     * @returns {Object} Объект гекса со всеми свойствами
     */
    createHex(q, r, id) {
        // [ЧТО] Базовая структура гекса с координатами и состоянием
        // [ЗАЧЕМ] Хранит всю информацию о гексе для игры и отрисовки
        // [PLAN] Добавить больше свойств (владелец, ресурсы и т.д.)
        
        // [ЧТО] Определяем тип местности на основе координат
        // [ЗАЧЕМ] Разные биомы для разнообразия геймплея
        // [PLAN] Загрузка из конфига или шумовой функции
        const terrain = this.getTerrainForHex(q, r);
        
        return {
            id: id,
            q: q, // Axial-координата q
            r: r, // Axial-координата r
            s: -q - r, // Третья координата для кубической системы (выводится из q и r)
            neighbors: {}, // Соседи по направлениям 0-5
            building: null, // Постройка на гексе (null если пусто)
            terrain: terrain, // Тип местности (plains, desert, snow)
            
            // [ЧТО] Pixel-координаты центра гекса (вычисляются при отрисовке)
            // [ЗАЧЕМ] Нужны для отрисовки и обработки кликов
            // [PLAN] Кэшировать вычисления для производительности
            x: 0,
            y: 0
        };
    }
    
    /**
     * Определение типа местности для гекса с плавными переходами
     * @param {number} q - Axial-координата q
     * @param {number} r - Axial-координата r
     * @returns {string} Тип местности ('plains', 'desert', 'snow')
     */
    getTerrainForHex(q, r) {
        // [ЧТО] Распределяем биомы с использованием шума для плавных переходов
        // [ЗАЧЕМ] Избежать резких границ между биомами
        // [PLAN] Использовать шум Перлина для ещё более плавных переходов
        
        const halfSize = Math.floor(this.mapSize / 2);
        const aspectRatio = 2.5;
        const maxR = Math.floor(halfSize / aspectRatio);
        
        // Нормализованные координаты (-1 до 1)
        const normQ = q / halfSize;
        const normR = r / maxR;
        
        // [ЧТО] Добавляем псевдо-шум на основе координат для вариативности
        // [ЗАЧЕМ] Создать естественные переходы между биомами
        // [PLAN] Заменить на настоящий шум Перлина
        const noise = Math.sin(q * 0.15) * Math.cos(r * 0.15) * 0.15 + 
                      Math.sin(q * 0.05 + r * 0.08) * 0.2;
        
        // [ЧТО] Базовая зональность с шумом для плавных переходов
        // Снежные пустоши - северные регионы (Сибирь, Дальний Восток)
        const snowThreshold = -0.3 + noise;
        // Пустыни - южные регионы (Калмыкия, Астраханская область)
        const desertThreshold = 0.5 + noise * 0.8;
        
        // [ЧТО] Проверяем основную зону
        let baseTerrain;
        if (normR < snowThreshold) {
            baseTerrain = 'snow';
        } else if (normR > desertThreshold && Math.abs(normQ) < 0.4) {
            baseTerrain = 'desert';
        } else {
            baseTerrain = 'plains';
        }
        
        // [ЧТО] Проверяем соседей чтобы избежать изолированных гексов
        // [ЗАЧЕМ] Гарантировать что гекс не окружён ТОЛЬКО биомами другого типа
        // [PLAN] Оптимизировать проверку соседей
        const neighborTerrains = this.getNeighborTerrains(q, r, baseTerrain);
        
        // Если все соседи другого типа, корректируем текущий биом
        if (neighborTerrains.allDifferent && neighborTerrains.count > 0) {
            // Выбираем наиболее частый биом среди соседей
            return neighborTerrains.dominantTerrain || baseTerrain;
        }
        
        return baseTerrain;
    }
    
    /**
     * Проверка соседних гексов на согласованность биомов
     * @param {number} q - Axial-координата q текущего гекса
     * @param {number} r - Axial-координата r текущего гекса
     * @param {string} currentTerrain - Текущий биом гекса
     * @returns {Object} Информация о соседях
     */
    getNeighborTerrains(q, r, currentTerrain) {
        const dq = [1, 0, -1, -1, 0, 1];
        const dr = [0, 1, 1, 0, -1, -1];
        
        const terrainCounts = { 'plains': 0, 'desert': 0, 'snow': 0 };
        let validNeighbors = 0;
        
        // Считаем биомы соседей (без рекурсии, только прямые соседи)
        for (let dir = 0; dir < 6; dir++) {
            const nq = q + dq[dir];
            const nr = r + dr[dir];
            
            // Быстрая проверка без создания гекса
            const halfSize = Math.floor(this.mapSize / 2);
            const aspectRatio = 2.5;
            const maxR = Math.floor(halfSize / aspectRatio);
            
            const normNQ = nq / halfSize;
            const normNR = nr / maxR;
            
            const noise = Math.sin(nq * 0.15) * Math.cos(nr * 0.15) * 0.15 + 
                          Math.sin(nq * 0.05 + nr * 0.08) * 0.2;
            
            const snowThreshold = -0.3 + noise;
            const desertThreshold = 0.5 + noise * 0.8;
            
            let neighborTerrain;
            if (normNR < snowThreshold) {
                neighborTerrain = 'snow';
            } else if (normNR > desertThreshold && Math.abs(normNQ) < 0.4) {
                neighborTerrain = 'desert';
            } else {
                neighborTerrain = 'plains';
            }
            
            terrainCounts[neighborTerrain]++;
            validNeighbors++;
        }
        
        // Находим доминирующий биом среди соседей
        let dominantTerrain = null;
        let maxCount = 0;
        for (const [terrain, count] of Object.entries(terrainCounts)) {
            if (count > maxCount && terrain !== currentTerrain) {
                maxCount = count;
                dominantTerrain = terrain;
            }
        }
        
        // Проверяем, все ли соседи другого типа
        const allDifferent = validNeighbors > 0 && 
                            (terrainCounts[currentTerrain] === 0);
        
        return {
            allDifferent: allDifferent,
            count: validNeighbors,
            dominantTerrain: dominantTerrain,
            counts: terrainCounts
        };
    }
    
    /**
     * Получение противоположного направления
     * @param {number} direction - Направление (0-5)
     * @returns {number} Противоположное направление (0-5)
     */
    getOppositeDirection(direction) {
        // [ЧТО] Противоположное направление = (direction + 3) % 6
        // [ЗАЧЕМ] Нужно для установления двусторонних связей между гексами
        // [PLAN] Вынести в утилиты
        return (direction + 3) % 6;
    }
    
    /**
     * Получение гекса по ID
     * @param {number} id - ID гекса
     * @returns {Object|null} Объект гекса или null если не найден
     */
    getHexById(id) {
        // [ЧТО] Поиск гекса в массиве по ID
        // [ЗАЧЕМ] Быстрый доступ к конкретному гексу
        // [PLAN] Использовать Map для O(1) доступа
        return this.hexes.find(hex => hex.id === id) || null;
    }
    
    /**
     * Получение всех гексов
     * @returns {Array} Массив всех гексов
     */
    getAllHexes() {
        // [ЧТО] Возврат ссылки на массив гексов
        // [ЗАЧЕМ] Для отрисовки и итерации по всем гексам
        // [PLAN] Вернуть копию массива для безопасности
        return this.hexes;
    }
    
    /**
     * Получение центрального гекса
     * @returns {Object} Центральный гекс
     */
    getCenterHex() {
        // [ЧТО] Возврат центрального гекса
        // [ЗАЧЕМ] Точка отсчёта для различных операций
        // [PLAN] Использовать для начальной позиции камеры
        return this.centerHex;
    }
    
    /**
     * Проверка наличия постройки на гексе
     * @param {number} hexId - ID гекса
     * @returns {boolean} true если есть постройка
     */
    hasBuilding(hexId) {
        // [ЧТО] Проверка свойства building у гекса
        // [ЗАЧЕМ] Определение доступности гекса для строительства
        // [PLAN] Добавить проверку типа постройки
        const hex = this.getHexById(hexId);
        return hex && hex.building !== null;
    }
    
    /**
     * Размещение постройки на гексе
     * @param {number} hexId - ID гекса
     * @param {Object} building - Объект постройки
     * @returns {boolean} true если успешно размещено
     */
    placeBuilding(hexId, building) {
        // [ЧТО] Установка постройки на гекс если он свободен
        // [ЗАЧЕМ] Основная механика строительства
        // [PLAN] Добавить проверку стоимости и требований
        const hex = this.getHexById(hexId);
        if (!hex || hex.building !== null) {
            return false;
        }
        
        hex.building = building;
        console.log(`[HexGrid] Постройка "${building.name}" размещена на гексе ${hexId}`);
        return true;
    }
    
    /**
     * Удаление постройки с гекса
     * @param {number} hexId - ID гекса
     * @returns {Object|null} Удалённая постройка или null
     */
    removeBuilding(hexId) {
        // [ЧТО] Удаление постройки и возврат её данных
        // [ЗАЧЕМ] Механика сноса зданий
        // [PLAN] Добавить возврат части ресурсов при сносе
        const hex = this.getHexById(hexId);
        if (!hex || !hex.building) {
            return null;
        }
        
        const building = hex.building;
        hex.building = null;
        console.log(`[HexGrid] Постройка "${building.name}" удалена с гекса ${hexId}`);
        return building;
    }
    
    /**
     * Получение размера гекса
     * @returns {number} Размер гекса
     */
    getHexSize() {
        return this.hexSize;
    }
    
    /**
     * Получение ширины гекса
     * @returns {number} Ширина гекса
     */
    getHexWidth() {
        return this.hexWidth;
    }
    
    /**
     * Получение высоты гекса
     * @returns {number} Высота гекса
     */
    getHexHeight() {
        return this.hexHeight;
    }
}

// [ЧТО] Экспорт класса для использования в других модулях
// [ЗАЧЕМ] Модульная архитектура требует явного экспорта
// [PLAN] Использовать ES6 modules в будущем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HexGrid;
}
