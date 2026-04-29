/**
 * @fileoverview Модуль гексагональной сетки и карты
 * [ЧТО] Базовый класс для работы с гексагональной координатной системой и картой мира.
 * [ЗАЧЕМ] Инкапсулирует логику конвертации координат, генерации карты формы России и управления гексами.
 * [PLAN] 1.1. Гексагональная основа, 1.4. Схожесть карты на реальную карту
 */

class HexGrid {
    /**
     * [ЧТО] Конструктор класса HexGrid с настройками по умолчанию.
     * [ЗАЧЕМ] Инициализирует параметры сетки: размер гекса, хранилище карты, камеру.
     * [PLAN] 1.1. Гексагональная основа
     * @param {number} hexSize - Размер гекса в пикселях (по умолчанию 15)
     */
    constructor(hexSize = 15) {
        // [ЧТО] Базовые размеры гексагональной ячейки.
        // [ЗАЧЕМ] hexHeight и hexWidth используются для расчёта позиций и отрисовки.
        this.hexSize = hexSize;
        this.hexHeight = hexSize * Math.sqrt(3);
        this.hexWidth = hexSize * 2;
        
        // [ЧТО] Хранилище всех гексов карты с ключом "q,r".
        // [ЗАЧЕМ] Быстрый доступ к любому гексу по его аксиальным координатам.
        this.map = new Map();
        
        // [ЧТО] Параметры камеры: смещение и масштаб.
        // [ЗАЧЕМ] Позволяют перемещать и масштабировать вид карты.
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1;
    }

    /**
     * [ЧТО] Конвертация экранных координат мыши в аксиальные гексагональные координаты.
     * [ЗАЧЕМ] Позволяет определить, на какой гекс кликнул пользователь.
     * [PLAN] 1.1. Гексагональная основа
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @returns {{q: number, r: number}} Аксиальные координаты гекса
     */
    screenToHex(screenX, screenY) {
        const adjX = (screenX - this.offsetX) / this.zoom;
        const adjY = (screenY - this.offsetY) / this.zoom;
        
        const q = (2/3 * adjX) / this.hexSize;
        const r = (-1/3 * adjX + Math.sqrt(3)/3 * adjY) / this.hexSize;
        
        return this.roundHex(q, r);
    }

    /**
     * [ЧТО] Округление дробных гексагональных координат до ближайшего целого гекса.
     * [ЗАЧЕМ] После конвертации из экранных координат получаются дробные значения, которые нужно округлить.
     * [PLAN] 1.1. Гексагональная основа
     * @param {number} q - Дробная q координата
     * @param {number} r - Дробная r координата
     * @returns {{q: number, r: number}} Округлённые координаты
     */
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

    /**
     * [ЧТО] Генерация уникального строкового ключа для гекса.
     * [ЗАЧЕМ] Используется как ключ в Map для хранения и поиска гексов.
     * [PLAN] 1.1. Гексагональная основа
     * @param {number} q - q координата
     * @param {number} r - r координата
     * @returns {string} Ключ в формате "q,r"
     */
    getHexKey(q, r) {
        return `${q},${r}`;
    }

    /**
     * [ЧТО] Конвертация аксиальных координат гекса в экранные координаты центра.
     * [ЗАЧЕМ] Необходимо для отрисовки гекса и объектов на нём в правильном месте экрана.
     * [PLAN] 1.1. Гексагональная основа
     * @param {number} q - q координата
     * @param {number} r - r координата
     * @returns {{x: number, y: number}} Экранная позиция центра гекса
     */
    hexToScreen(q, r) {
        const x = this.hexSize * (3/2 * q) * this.zoom + this.offsetX;
        const y = this.hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r) * this.zoom + this.offsetY;
        return { x, y };
    }

    /**
     * [ЧТО] Инициализация карты с формой, напоминающей территорию России.
     * [ЗАЧЕМ] Визуальная схожесть с реальной картой России улучшает погружение в игру.
     * [PLAN] 1.4. Схожесть карты на реальную карту
     * @param {number} width - Полуширина карты в гексах
     * @param {number} height - Полувисота карты в гексах
     */
    initMap(width = 40, height = 30) {
        for (let q = -width; q <= width; q++) {
            for (let r = -height; r <= height; r++) {
                if (Math.abs(q + r) <= Math.max(width, height)) {
                    const key = this.getHexKey(q, r);
                    
                    // [ЧТО] Проверка принадлежности гекса к форме России.
                    // [ЗАЧЕМ] Исключаем гексы за пределами целевой формы карты.
                    if (!this.isInRussiaShape(q, r, width, height)) {
                        continue;
                    }
                    
                    // [ЧТО] Генерация типа местности (равнина, пустыня, снег).
                    // [ЗАЧЕМ] Создаёт визуальное разнообразие биомов на карте.
                    // [PLAN] 1.1. Климатические регионы
                    const rand = Math.random();
                    let terrain = 'plain';
                    if (rand > 0.85) terrain = 'desert';
                    else if (rand > 0.95) terrain = 'snow';
                    
                    // [ЧТО] Генерация преград рельефа (горы, пропасти, вода).
                    // [ЗАЧЕМ] Создаёт тактические барьеры для прокладки сети.
                    // [PLAN] 1.2. Преграды рельефа
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
    
    /**
     * [ЧТО] Проверка принадлежности гекса к форме "Россия" с детализированными очертаниями.
     * [ЗАЧЕМ] Создаёт узнаваемые географические элементы: Калининград, Крым, Байкал, Сахалин, Камчатка.
     * [PLAN] 1.4. Схожесть карты на реальную карту
     * @param {number} q - q координата гекса
     * @param {number} r - r координата гекса
     * @param {number} width - Полуширина карты
     * @param {number} height - Полувисота карты
     * @returns {boolean} true если гекс внутри формы России
     */
    isInRussiaShape(q, r, width, height) {
        const normQ = q / width;
        const normR = r / height;
        
        // Западная часть (Европа) - с Калининградом и Крымом
        if (normQ < -0.5) {
            const maxR = 0.7 + Math.sin((normQ + 0.5) * Math.PI) * 0.12;
            
            // Калининградский выступ
            if (normQ < -0.85 && normR > -0.1 && normR < 0.2) {
                return true;
            }
            
            // Крым
            if (normQ > -0.75 && normQ < -0.55 && normR < -0.35 && normR > -0.65) {
                return true;
            }
            
            return Math.abs(normR) < maxR;
        }
        
        // Центральная часть (Урал и Западная Сибирь)
        if (normQ >= -0.5 && normQ < -0.2) {
            const maxR = 0.6 + Math.sin((normQ + 0.5) * Math.PI * 1.5) * 0.15;
            return Math.abs(normR) < maxR;
        }
        
        // Сибирь - с Байкалом
        if (normQ >= -0.2 && normQ < 0.3) {
            const northLimit = 0.55 + Math.sin((normQ + 0.2) * Math.PI) * 0.18;
            const southLimit = 0.4 + Math.cos((normQ + 0.2) * Math.PI) * 0.12;
            
            // Байкал
            if (normQ > 0.0 && normQ < 0.15 && normR < -0.15 && normR > -0.35) {
                return true;
            }
            
            return normR < northLimit && normR > -southLimit;
        }
        
        // Восточная Сибирь и Дальний Восток - с Сахалином
        if (normQ >= 0.3 && normQ < 0.65) {
            const northLimit = 0.5 - (normQ - 0.3) * 0.35;
            const southLimit = 0.35 + (normQ - 0.3) * 0.6;
            
            // Сахалин
            if (normQ > 0.5 && normQ < 0.65 && normR < -0.15 && normR > -0.4) {
                return true;
            }
            
            return normR < northLimit && normR > -southLimit;
        }
        
        // Дальневосточный конец - с Камчаткой
        if (normQ >= 0.65) {
            const maxR = 0.3 - (normQ - 0.65) * 0.4;
            
            // Камчатка
            if (normQ > 0.8 && normQ < 0.95 && normR > 0.05 && normR < 0.35) {
                return true;
            }
            
            if (maxR <= 0) return false;
            return Math.abs(normR) < maxR;
        }
        
        return true;
    }

    /**
     * [ЧТО] Проверка возможности размещения объекта на гексе.
     * [ЗАЧЕМ] Предотвращает размещение на преградах или занятых гексах.
     * [PLAN] 1.3. Логика размещения объектов
     * @param {number} q - q координата
     * @param {number} r - r координата
     * @returns {boolean} true если размещение возможно
     */
    canPlace(q, r) {
        const key = this.getHexKey(q, r);
        const hex = this.map.get(key);
        if (!hex) return false;
        if (hex.obstacle) return false;
        if (hex.object) return false;
        return true;
    }

    /**
     * [ЧТО] Размещение объекта на указанном гексе.
     * [ЗАЧЕМ] Добавляет строение или пользователя на карту.
     * [PLAN] 1.3. Логика размещения объектов
     * @param {number} q - q координата
     * @param {number} r - r координата
     * @param {Object} obj - Объект для размещения
     * @returns {boolean} true если успешно размещён
     */
    placeObject(q, r, obj) {
        const key = this.getHexKey(q, r);
        const hex = this.map.get(key);
        if (hex && this.canPlace(q, r)) {
            hex.object = obj;
            return true;
        }
        return false;
    }

    /**
     * [ЧТО] Удаление объекта с гекса.
     * [ЗАЧЕМ] Освобождает гекс при сносе строения.
     * [PLAN] 4.3. Управление инфраструктурой
     * @param {number} q - q координата
     * @param {number} r - r координата
     * @returns {Object|null} Удалённый объект или null
     */
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

    /**
     * [ЧТО] Получение данных гекса по координатам.
     * [ЗАЧЕМ] Возвращает полную информацию о гексе для отображения или логики.
     * [PLAN] 1.1. Гексагональная основа
     * @param {number} q - q координата
     * @param {number} r - r координата
     * @returns {Object|undefined} Данные гекса
     */
    getHex(q, r) {
        return this.map.get(this.getHexKey(q, r));
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HexGrid;
}
