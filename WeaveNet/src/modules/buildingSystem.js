/**
 * BuildingSystem - Система управления постройками и их режимами
 * [ЧТО] Управляет логикой работы построек: режимы, покрытие, энергия, режимы работы
 * [ЗАЧЕМ] 3.1-3.2 - Характеристики построек, управление режимами (Белый/Желтый/Зеленый)
 * [PLAN] 4.1 - Логика соединения, радиус и дальность сигнала
 * 
 * [МОДУЛЬ 3] Экономика и Строения
 * - Режимы: ⚪ Белый (неактивен), 🟡 Желтый (50% мощности), 🟢 Зеленый (100%)
 * - Радиусы: зависят от типа постройки и режима работы
 * - Энергия: потребление зависит от режима
 */

class BuildingSystem {
    /**
     * Конструктор системы построек
     */
    constructor() {
        // [ЧТО] Словарь типов построек с параметрами
        // [ЗАЧЕМ] Централизованное хранилище характеристик
        this.buildingTypes = {
            'tower': {
                name: 'Вышка',
                cost: 50,
                color: '#4a9eff',
                baseRadius: 6,        // 6 гексов
                basePowerConsumption: 8,  // Единиц энергии в секунду
                description: 'Мощная вышка связи'
            },
            'relay': {
                name: 'Ретранслятор',
                cost: 30,
                color: '#4ade80',
                baseRadius: 4,        // 4 гекса
                basePowerConsumption: 5,
                description: 'Усилитель сигнала'
            },
            'generator': {
                name: 'Генератор',
                cost: 100,
                color: '#fbbf24',
                baseRadius: 0,        // Не излучает сигнал
                basePowerConsumption: 0,  // Производит энергию
                basePowerProduction: 5,   // +5 энергии в секунду
                description: 'Производит энергию'
            }
        };
        
        // [ЧТО] Параметры режимов работы
        // [ЗАЧЕМ] 3.2 - Определение эффектов режимов
        this.modes = {
            'white': {
                name: 'Неактивен',
                radiusMultiplier: 0,    // Нет сигнала
                powerMultiplier: 0,     // Нет потребления
                description: 'Постройка о��ключена, не потребляет энергию'
            },
            'yellow': {
                name: 'Скрытый',
                radiusMultiplier: 0.5,  // 50% радиуса
                powerMultiplier: 0.5,   // 50% потребления
                description: 'Сниженная мощность для экономии энергии'
            },
            'green': {
                name: 'Открытый',
                radiusMultiplier: 1.0,  // 100% радиуса
                powerMultiplier: 1.0,   // 100% потребления
                description: 'Полная мощность, максимальное покрытие'
            }
        };
        
        // [ЧТО] Текущие активные постройки на ка��те
        // [ЗАЧЕМ] Отслеживание всех построек и их состояния
        this.buildings = new Map();  // key: hexId, value: building object
        
        console.log('[BuildingSystem] Инициализирована система управления постройками');
    }
    
    /**
     * Создание экземпляра постройки
     * [ЧТО] Создаёт объект постройки с начальными параметрами
     * [ЗАЧЕМ] Стандартизация структуры всех построек
     * @param {string} typeId - ID типа постройки
     * @returns {object} Объект постройки
     */
    createBuilding(typeId) {
        // [ЧТО] Проверяем что тип существует
        // [ЗАЧЕМ] Защита от создания неправильных типов
        if (!this.buildingTypes.hasOwnProperty(typeId)) {
            console.error(`[BuildingSystem] Неизвестный тип постройки: ${typeId}`);
            return null;
        }
        
        const type = this.buildingTypes[typeId];
        
        // [ЧТО] Создаём новую постройку с начальными параметрами
        // [ЗАЧЕМ] 3.1.2 - Структура данных постройки
        const building = {
            id: Math.random().toString(36).substr(2, 9),  // Уникальный ID
            typeId: typeId,
            name: type.name,
            cost: type.cost,
            color: type.color,
            
            // [ЧТО] Режим работы (начинается в Зелёном)
            // [ЗАЧЕМ] 3.2 - Режимы работы построек
            mode: 'green',
            
            // [ЧТО] Базовые характеристики
            // [ЗАЧЕМ] Для расчётов покрытия и энергии
            baseRadius: type.baseRadius,
            basePowerConsumption: type.basePowerConsumption,
            basePowerProduction: type.basePowerProduction || 0,
            
            // [ЧТО] Текущие эффективные значения (с учётом режима)
            // [ЗАЧЕМ] Быстрый доступ к эффективным параметрам
            currentRadius: type.baseRadius,
            currentPowerConsumption: type.basePowerConsumption,
            
            // [ЧТО] Состояние
            // [ЗАЧЕМ] Отслеживание здоровья и активности
            health: 100,  // % здоровья
            isActive: true,  // Работает ли
            createdAt: Date.now(),
            connections: []  // Соседние постройки
        };
        
        return building;
    }
    
    /**
     * Изменение режима работы постройки
     * [ЧТО] Переключает режим и пересчитывает параметры
     * [ЗАЧЕМ] 3.2 - Управление режимами для оптимизации ресурсов
     * @param {object} building - Объект постройки
     * @param {string} newMode - Новый режим ('white', 'yellow', 'green')
     * @returns {boolean} true если успешно изменён
     */
    setMode(building, newMode) {
        // [ЧТО] Проверяем валидность режима
        // [ЗАЧЕМ] Защита от ошибок
        if (!this.modes.hasOwnProperty(newMode)) {
            console.error(`[BuildingSystem] Неизвестный режим: ${newMode}`);
            return false;
        }
        
        building.mode = newMode;
        
        // [ЧТО] Пересчитываем эффективные параметры
        // [ЗАЧЕМ] Обновление значений в зависимости от режима
        const modeParams = this.modes[newMode];
        building.currentRadius = Math.round(building.baseRadius * modeParams.radiusMultiplier);
        building.currentPowerConsumption = building.basePowerConsumption * modeParams.powerMultiplier;
        
        // [ЧТО] Белый режим = неактивная постройка
        // [ЗАЧЕМ] 3.2.1 - Неактивные постройки не участвуют в игре
        building.isActive = (newMode !== 'white');
        
        console.log(`[BuildingSystem] Постройка ${building.id} переведена в режим ${newMode}`);
        return true;
    }
    
    /**
     * Получение эффективного радиуса с учётом ландшафта
     * [ЧТО] Рассчитывает действительный радиус с учётом преград
     * [ЗАЧЕМ] 4.1.1 - Радиус влияет на покрытие и заражение пользователей
     * @param {object} building - Объект постройки
     * @param {object} centerHex - Гекс где находится постройка
     * @param {object} hexGrid - Сетка гексов для проверки преград
     * @returns {number} Эффективный радиус
     */
    getEffectiveRadius(building, centerHex, hexGrid) {
        // [ЧТО] Начиная с базового радиуса постройки
        // [ЗАЧЕМ] 4.1.1 - Расчёт зоны действия
        let radius = building.currentRadius;
        
        // [ЧТО] Проверяем преграды вокруг постройки
        // [ЗАЧЕМ] 4.1.2 - Влияние ландшафта на сигнал
        // Горы и пропасти могут ограничить радиус в определённых направлениях
        
        // Для простоты пока считаем полный радиус
        // В будущем можно добавить расчёт по направлениям
        
        return radius;
    }
    
    /**
     * Получение всех гексов в радиусе покрытия
     * [ЧТО] Рассчитывает все гексы в зоне действия постройки
     * [ЗАЧЕМ] 4.2.1 - Определение кого заражить и кого подключить к сети
     * @param {object} building - Объект постройки
     * @param {object} centerHex - Гекс где находится постройка
     * @param {object} hexGrid - Сетка гексов для поиска соседей
     * @returns {array} Массив гексов в радиусе
     */
    getHexesInRadius(building, centerHex, hexGrid) {
        // [ЧТО] Рассчитываем радиус с учётом режима
        // [ЗАЧЕМ] Для поиска гексов в зоне действия
        const radius = building.currentRadius;
        
        if (radius === 0) {
            // Генератор не излучает сигнал
            return [];
        }
        
        // [ЧТО] Используем BFS (поиск в ширину) для нахождения всех гексов на расстоянии ≤ radius
        // [ЗАЧЕМ] 4.2.1 - Определение зоны действия постройки
        const visited = new Set();
        const result = [];
        const queue = [{ hex: centerHex, distance: 0 }];
        
        while (queue.length > 0) {
            const { hex, distance } = queue.shift();
            
            if (visited.has(hex.id)) continue;
            visited.add(hex.id);
            
            if (distance > 0 && distance <= radius) {
                result.push(hex);
            }
            
            // [ЧТО] Добавляем соседей в очередь если не превышен радиус
            // [ЗАЧЕМ] Поиск всех гексов в зоне
            if (distance < radius) {
                Object.values(hex.neighbors).forEach(neighbor => {
                    if (neighbor && !visited.has(neighbor.id)) {
                        // [ЧТО] Проверяем проходимость (преграды не блокируют полностью, но замедляют)
                        // [ЗАЧЕМ] 4.1.2 - Влияние ландшафта на сигнал
                        queue.push({ hex: neighbor, distance: distance + 1 });
                    }
                });
            }
        }
        
        return result;
    }
    
    /**
     * Проверка видимости между двумя гексами (есть ли прямая линия сигнала)
     * [ЧТО] Проверяет не блокируют ли преграды сигнал между гексами
     * [ЗАЧЕМ] 4.1.2 - Горы и пропасти блокируют сигнал
     * @param {object} hexFrom - Начальный гекс
     * @param {object} hexTo - Конечный гекс
     * @param {object} hexGrid - Сетка гексов
     * @returns {boolean} true если сигнал проходит
     */
    canSignalPass(hexFrom, hexTo, hexGrid) {
        // [ЧТО] Проверяем прямые преграды
        // [ЗАЧЕМ] 4.1.2 - Горы и пропасти блокируют сигнал
        
        // Для простоты пока считаем что сигнал всегда проходит
        // В будущем добавить Bresenham's line algorithm для проверки всех гексов на линии
        
        return hexGrid.isSignalPassable(hexFrom) && hexGrid.isSignalPassable(hexTo);
    }
    
    /**
     * Регистрация постройки на карте
     * [ЧТО] Добавляет постройку в список активных
     * [ЗАЧЕМ] Отслеживание всех построек
     * @param {number} hexId - ID гекса
     * @param {object} building - Объект постройки
     */
    registerBuilding(hexId, building) {
        this.buildings.set(hexId, building);
        console.log(`[BuildingSystem] Постройка зарегистрирована на гексе ${hexId}`);
    }
    
    /**
     * Удаление постройки с карты
     * [ЧТО] Убирает постройку из списка активных
     * [ЗАЧЕМ] Снос здания
     * @param {number} hexId - ID гекса
     */
    unregisterBuilding(hexId) {
        this.buildings.delete(hexId);
        console.log(`[BuildingSystem] Постройка удалена с гекса ${hexId}`);
    }
    
    /**
     * Получение всех активных построек
     * @returns {array} Массив всех построек
     */
    getAllBuildings() {
        return Array.from(this.buildings.values());
    }
    
    /**
     * Получение постройки на гексе
     * @param {number} hexId - ID гекса
     * @returns {object|null} Постройка или null
     */
    getBuildingOnHex(hexId) {
        return this.buildings.get(hexId) || null;
    }
    
    /**
     * Получение типа постройки
     * @param {string} typeId - ID типа
     * @returns {object|null} Тип постройки или null
     */
    getBuildingType(typeId) {
        return this.buildingTypes[typeId] || null;
    }
    
    /**
     * Получение параметров режима
     * @param {string} mode - ID режима
     * @returns {object|null} Параметры режима или null
     */
    getModeParams(mode) {
        return this.modes[mode] || null;
    }
}

// [ЧТО] Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BuildingSystem;
}
