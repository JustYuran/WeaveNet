/**
 * Buildings - Модуль управления типами построек
 * [ЧТО] Содержит все доступные типы зданий и их характеристики
 * [ЗАЧЕМ] Централизованное хранилище данных о постройках
 * [PLAN] Добавить больше типов, уровни, улучшения
 */

class Buildings {
    /**
     * Конструктор менеджера построек
     * [ЧТО] Инициализирует список доступных типов зданий
     * [ЗАЧЕМ] Предоставляет данные для строительства
     * [PLAN] Загрузка из JSON конфига
     */
    constructor() {
        // [ЧТО] Базовые типы построек
        // [ЗАЧЕМ] Игрок может строить эти здания
        // [PLAN] Добавить больше типов через конфиг
        this.buildingTypes = [
            { 
                id: 'tower', 
                name: 'Вышка', 
                cost: 50, 
                color: '#4a9eff', 
                description: 'Базовая вышка связи',
                icon: '📡'
            },
            { 
                id: 'relay', 
                name: 'Ретранслятор', 
                cost: 30, 
                color: '#4ade80', 
                description: 'Усиливает сигнал',
                icon: '📶'
            },
            { 
                id: 'generator', 
                name: 'Генератор', 
                cost: 100, 
                color: '#fbbf24', 
                description: 'Производит энергию',
                icon: '⚡'
            }
        ];
    }

    /**
     * Получение всех типов построек
     * @returns {Array} Массив всех доступных типов
     */
    getAllBuildingTypes() {
        return this.buildingTypes;
    }

    /**
     * Получение типа постройки по ID
     * @param {string} id - ID типа постройки
     * @returns {Object|null} Объект типа или null
     */
    getBuildingTypeById(id) {
        return this.buildingTypes.find(type => type.id === id) || null;
    }

    /**
     * Создание объекта постройки
     * @param {string} typeId - ID типа постройки
     * @returns {Object|null} Объект постройки или null
     */
    createBuilding(typeId) {
        const type = this.getBuildingTypeById(typeId);
        if (!type) return null;

        return {
            ...type,
            level: 1,
            placedAt: Date.now(),
            maxLevel: 5,
            production: this.getProductionByType(typeId)
        };
    }

    /**
     * Получение характеристик производства по типу
     * @param {string} typeId - ID типа постройки
     * @returns {Object} Характеристики производства
     */
    getProductionByType(typeId) {
        const production = {
            'tower': { info: 1, energy: 0 },
            'relay': { info: 0.5, energy: 0.5 },
            'generator': { info: 0, energy: 2 }
        };
        return production[typeId] || { info: 0, energy: 0 };
    }

    /**
     * Получение стоимости улучшения
     * @param {Object} building - Объект постройки
     * @returns {number} Стоимость улучшения
     */
    getUpgradeCost(building) {
        const baseCost = building.cost;
        const levelMultiplier = Math.pow(1.5, building.level);
        return Math.floor(baseCost * levelMultiplier);
    }

    /**
     * Улучшение постройки
     * @param {Object} building - Объект постройки
     * @returns {boolean} true если успешно улучшено
     */
    upgradeBuilding(building) {
        if (building.level >= building.maxLevel) {
            return false;
        }
        building.level++;
        building.production = this.getProductionByType(building.id);
        // Увеличиваем производство на 50% за уровень
        building.production.info *= building.level;
        building.production.energy *= building.level;
        return true;
    }
}

// [ЧТО] Экспорт класса для использования в других модулях
// [ЗАЧЕМ] Модульная архитектура требует явного экспорта
// [PLAN] Использовать ES6 modules в будущем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Buildings;
}
