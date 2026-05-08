/**
 * ResourceManager - Менеджер ресурсов и экономики
 * [ЧТО] Управляет ресурсами (Информация, Энергия) и рассчитывает доход/расход
 * [ЗАЧЕМ] 3.3 - Экономический баланс: расчёт дохода от пользователей и расхода энергии
 * [PLAN] 3.3.2 - Формулы дохода и расхода, баланс Энергии
 * 
 * [МОДУЛЬ 3] Экономика и Строения
 * - Информация: валюта строительства, доход от пользователей
 * - Энергия: ресурс обслуживания, расходуется на активные постройки, генерируется генераторами
 * - Баланс: игрок балансирует между количеством построек и доступной энергией
 */

class ResourceManager {
    /**
     * Конструктор менеджера ресурсов
     * @param {object} initialResources - Начальные ресурсы {info, energy}
     */
    constructor(initialResources = { info: 1000, energy: 100 }) {
        // [ЧТО] Текущие ресурсы игрока
        // [ЗАЧЕМ] Отслеживание баланса
        this.resources = {
            info: initialResources.info,
            energy: initialResources.energy
        };
        
        // [ЧТО] История транзакций для отладки
        // [ЗАЧЕМ] Понимание потоков ресурсов
        this.history = [];
        
        // [ЧТО] Множители баланса
        // [ЗАЧЕМ] Настройка сложности и баланса игры
        this.balanceMultipliers = {
            incomeMultiplier: 1.0,  // Множитель дохода
            energyCostMultiplier: 1.0  // Множитель расхода энергии
        };
        
        console.log(`[ResourceManager] Инициализирован. Начальные ресурсы: Info=${this.resources.info}, Energy=${this.resources.energy}`);
    }
    
    /**
     * Расчёт дохода от пользователей
     * [ЧТО] Вычисляет доход Информации по формуле: (Желтые×0.5 + Зеленые×1.0)/с
     * [ЗАЧЕМ] 3.3.2 - Основной источник валюты
     * @param {object} userStats - Статистика пользователей {yellow, green, total}
     * @returns {number} Доход в единицах Информации
     */
    calculateInfoIncome(userStats) {
        // [ЧТО] Применяем формулу дохода: Жёлтые×0.5 + Зелёные×1.0
        // [ЗАЧЕМ] 2.2.2 - Зелёные приносят больше дохода
        // [PLAN] 3.3.2 - Использование в главном цикле
        const income = (
            (userStats.yellow || 0) * 0.5 +
            (userStats.green || 0) * 1.0
        ) * this.balanceMultipliers.incomeMultiplier;
        
        return income;
    }
    
    /**
     * Расчёт расхода энергии на постройки
     * [ЧТО] Вычисляет суммарный расход энергии всеми активными постройками
     * [ЗАЧЕМ] 3.3.2 - Определение дефицита энергии
     * @param {array} buildings - Массив активных построек
     * @returns {number} Расход энергии в единицах
     */
    calculateEnergyConsumption(buildings) {
        // [ЧТО] Суммируем потребление каждой постройки
        // [ЗАЧЕМ] 3.3.2 - Расход Энергии = Σ(потребление каждой активной постройки)
        // [PLAN] Добавить режимы (Белый/Желтый/Зеленый) влияющие на расход
        
        let totalConsumption = 0;
        
        buildings.forEach(building => {
            // [ЧТО] Только активные постройки (не Белый режим) потребляют энергию
            // [ЗАЧЕМ] 3.2.1 - Белый режим позволяет сэкономить энергию
            if (building.mode !== 'white') {
                let consumption = building.basePowerConsumption || 0;
                
                // [ЧТО] Жёлтый режим потребляет 50% от базового
                // [ЗАЧЕМ] 3.2.2 - Экономия энергии в Жёлтом режиме
                if (building.mode === 'yellow') {
                    consumption *= 0.5;
                }
                
                // [ЧТО] Зелёный режим потребляет 100% (стандарт)
                // [ЗАЧЕМ] 3.2.3 - Полное потребление в Зелёном режиме
                
                totalConsumption += consumption;
            }
        });
        
        return totalConsumption * this.balanceMultipliers.energyCostMultiplier;
    }
    
    /**
     * Расчёт дохода энергии от генераторов
     * [ЧТО] Вычисляет производство энергии
     * [ЗАЧЕМ] 3.3.1 - Источник энергии для постройки
     * @param {object} userStats - Статистика пользователей
     * @param {number} generatorCount - Количество активных генераторов
     * @returns {number} Доход энергии
     */
    calculateEnergyProduction(userStats, generatorCount = 0) {
        // [ЧТО] Энергия генерируется двумя способами:
        // 1. От активных пользователей: +1/с за каждые 10 активных пользователей
        // 2. От генераторов: +5 Энергии/сек за каждый активный генератор
        // [ЗАЧЕМ] 3.3.1 - Основные источники энергии
        
        // Расчёт активных пользователей (Жёлтые + Зелёные)
        const activeUsers = (userStats.yellow || 0) + (userStats.green || 0);
        const userEnergyProduction = Math.floor(activeUsers / 10);
        
        // Производство от генераторов
        const generatorEnergyProduction = generatorCount * 5;
        
        return userEnergyProduction + generatorEnergyProduction;
    }
    
    /**
     * Получение ресурса
     * @param {string} resourceType - Тип ресурса ('info' или 'energy')
     * @returns {number} Текущее значение ресурса
     */
    getResource(resourceType) {
        return this.resources[resourceType] || 0;
    }
    
    /**
     * Получение всех ресурсов
     * @returns {object} Объект с текущими ресурсами
     */
    getAllResources() {
        return {
            info: this.resources.info,
            energy: this.resources.energy
        };
    }
    
    /**
     * Добавление ресурса
     * [ЧТО] Увеличивает значение ресурса и логирует операцию
     * [ЗАЧЕМ] Доход от построек, возврат при сносе и т.д.
     * @param {string} resourceType - Тип ресурса
     * @param {number} amount - Количество
     * @param {string} reason - Причина добавления для логирования
     */
    addResource(resourceType, amount, reason = 'unknown') {
        if (this.resources.hasOwnProperty(resourceType)) {
            this.resources[resourceType] += amount;
            this.history.push({
                type: 'add',
                resourceType: resourceType,
                amount: amount,
                reason: reason,
                timestamp: Date.now(),
                balance: this.resources[resourceType]
            });
            console.log(`[ResourceManager] +${amount} ${resourceType} (${reason}). Баланс: ${this.resources[resourceType]}`);
        }
    }
    
    /**
     * Расходование ресурса
     * [ЧТО] Уменьшает значение ресурса и логирует операцию
     * [ЗАЧЕМ] Строительство, обслуживание
     * @param {string} resourceType - Тип ресурса
     * @param {number} amount - Количество
     * @param {string} reason - Причина расхода
     * @returns {boolean} true если достаточно ресурсов
     */
    spendResource(resourceType, amount, reason = 'unknown') {
        if (!this.resources.hasOwnProperty(resourceType)) {
            return false;
        }
        
        if (this.resources[resourceType] < amount) {
            console.warn(`[ResourceManager] Недостаточно ${resourceType}! Нужно: ${amount}, есть: ${this.resources[resourceType]}`);
            return false;
        }
        
        this.resources[resourceType] -= amount;
        this.history.push({
            type: 'spend',
            resourceType: resourceType,
            amount: amount,
            reason: reason,
            timestamp: Date.now(),
            balance: this.resources[resourceType]
        });
        console.log(`[ResourceManager] -${amount} ${resourceType} (${reason}). Баланс: ${this.resources[resourceType]}`);
        return true;
    }
    
    /**
     * Проверка наличия достаточного ресурса
     * @param {string} resourceType - Тип ресурса
     * @param {number} amount - Требуемое количество
     * @returns {boolean} true если достаточно
     */
    hasEnough(resourceType, amount) {
        return (this.resources[resourceType] || 0) >= amount;
    }
    
    /**
     * Установка множителя баланса
     * [ЧТО] Изменяет множитель для настройки сложности
     * [ЗАЧЕМ] Баланс игры: упрощение/усложнение
     * @param {string} multiplierType - Тип множителя
     * @param {number} value - Значение множителя
     */
    setBalanceMultiplier(multiplierType, value) {
        if (this.balanceMultipliers.hasOwnProperty(multiplierType)) {
            this.balanceMultipliers[multiplierType] = value;
            console.log(`[ResourceManager] Множитель ${multiplierType} изменён на ${value}`);
        }
    }
    
    /**
     * Получение истории транзакций
     * @param {number} limit - Количество последних записей (0 = все)
     * @returns {array} Массив транзакций
     */
    getHistory(limit = 0) {
        if (limit === 0) {
            return this.history;
        }
        return this.history.slice(-limit);
    }
    
    /**
     * Очистка истории
     */
    clearHistory() {
        this.history = [];
    }
}

// [ЧТО] Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResourceManager;
}
