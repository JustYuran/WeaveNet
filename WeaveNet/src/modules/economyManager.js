/**
 * @fileoverview Модуль экономики и управления ресурсами
 * [ЧТО] Класс для расчёта производства/потребления ресурсов, баланса энергии и информации.
 * [ЗАЧЕМ] Инкапсулирует экономическую логику игры: генерацию, расход, автоматические отключения.
 * [PLAN] 4. Экономика
 */

class EconomyManager {
    /**
     * [ЧТО] Конструктор менеджера экономики.
     * [ЗАЧЕМ] Инициализирует стартовые ресурсы и базовые параметры генерации.
     * @param {HexGrid} hexGrid - Ссылка на сетку для доступа к объектам
     */
    constructor(hexGrid) {
        this.grid = hexGrid;
        
        // [ЧТО] Текущие запасы ресурсов.
        // [ЗАЧЕМ] Информация для строительства, энергия для обслуживания зданий.
        this.info = 100;
        this.energy = 50;
        
        // [ЧТО] Ставки прироста/расхода в секунду.
        // [ЗАЧЕМ] Для отображения в UI и расчёта дельты за кадр.
        this.infoRate = 0;
        this.energyRate = 0;
        
        // [ЧТО] Базовая пассивная генерация энергии.
        // [ЗАЧЕМ] Стартовый прирост для начала игры без зданий.
        // [PLAN] 4.1. Типы ресурсов
        this.baseEnergyProduction = 10;
    }

    /**
     * [ЧТО] Расчёт и применение изменений ресурсов за единицу времени.
     * [ЗАЧЕМ] Обновляет запасы информации и энергии каждый кадр с учётом скорости игры.
     * [PLAN] 4.2. Баланс потоков
     * @param {number} deltaTime - Время между кадрами в секундах
     * @param {number} speed - Множитель скорости игры
     * @returns {{info: number, energy: number, infoRate: number, energyRate: number}} Текущее состояние
     */
    update(deltaTime, speed) {
        let energyConsumption = 0;
        let infoProduction = 0;

        // Подсчёт потребления и производства по всем объектам
        this.grid.map.forEach(hex => {
            if (hex.object && hex.object.mode === 'active') {
                energyConsumption += hex.object.energyCost;
                infoProduction += 1.0;
            } else if (hex.object && hex.object.mode === 'economy') {
                energyConsumption += hex.object.energyCost * 0.5;
                infoProduction += 0.5;
            }
            // blocked и inactive не потребляют и не производят
        });

        // [ЧТО] Расчёт пассивной генерации энергии с бонусом от количества объектов.
        // [ЗАЧЕМ] Чем больше сеть, тем больше дополнительная генерация энергии.
        const activeObjects = Array.from(this.grid.map.values())
            .filter(h => h.object && h.object.mode === 'active').length;
        const economyObjects = Array.from(this.grid.map.values())
            .filter(h => h.object && h.object.mode === 'economy').length;
        const energyProduction = this.baseEnergyProduction + 
            Math.floor((activeObjects + economyObjects * 0.5) / 10);

        this.energyRate = energyProduction - energyConsumption;
        this.infoRate = infoProduction;

        // Применение изменений с учётом скорости игры
        const scaledDelta = deltaTime * speed;
        this.energy += (energyProduction - energyConsumption) * scaledDelta;
        this.info += infoProduction * scaledDelta;

        // Ограничение снизу (не меньше 0)
        this.energy = Math.max(0, this.energy);
        this.info = Math.max(0, this.info);

        return {
            info: this.info,
            energy: this.energy,
            infoRate: this.infoRate,
            energyRate: this.energyRate
        };
    }

    /**
     * [ЧТО] Проверка и списание стоимости строительства.
     * [ЗАЧЕМ] Возвращает true если достаточно информации для постройки.
     * [PLAN] 4.3. Управление инфраструктурой
     * @param {number} cost - Стоимость объекта
     * @returns {boolean} true если можно построить
     */
    canAfford(cost) {
        return this.info >= cost;
    }

    /**
     * [ЧТО] Списывание ресурса информации при строительстве.
     * [ЗАЧЕМ] Уменьшает запас на стоимость объекта.
     * @param {number} cost - Стоимость объекта
     */
    spendInfo(cost) {
        this.info -= cost;
    }

    /**
     * [ЧТО] Возврат части ресурса при сносе здания (50%).
     * [ЗАЧЕМ] Компенсация игроку за демонтаж строения.
     * [PLAN] 4.3. Управление инфраструктурой
     * @param {number} originalCost - Оригинальная стоимость здания
     */
    refundInfo(originalCost) {
        this.info += Math.floor(originalCost * 0.5);
    }

    /**
     * [ЧТО] Получение текущих значений ресурсов и ставок.
     * [ЗАЧЕМ] Для обновления UI.
     * @returns {{info: number, energy: number, infoRate: number, energyRate: number}}
     */
    getState() {
        return {
            info: this.info,
            energy: this.energy,
            infoRate: this.infoRate,
            energyRate: this.energyRate
        };
    }

    /**
     * [ЧТО] Установка значений ресурсов (для загрузки сохранения).
     * [ЗАЧЕМ] Восстанавливает состояние экономики из сохранённых данных.
     * @param {number} info - Запас информации
     * @param {number} energy - Запас энергии
     */
    setState(info, energy) {
        this.info = info || 100;
        this.energy = energy || 50;
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EconomyManager;
}
