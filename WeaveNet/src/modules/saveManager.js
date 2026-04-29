/**
 * @fileoverview Модуль сохранения и загрузки состояния игры
 * [ЧТО] Класс для автосохранения, ручной загрузки и экспорта конфигурации.
 * [ЗАЧЕМ] Позволяет сохранять прогресс в localStorage, загружать его и обмениваться конфигурациями.
 * [PLAN] 8.3. Сохранение и экспорт
 */

class SaveManager {
    /**
     * [ЧТО] Конструктор менеджера сохранений.
     * [ЗАЧЕМ] Инициализирует таймеры автосохранения и ссылку на игру.
     * @param {Game} game - Ссылка на основной объект игры
     */
    constructor(game) {
        this.game = game;
        
        // [ЧТО] Интервал автосохранения в секундах (5 минут).
        // [ЗАЧЕМ] Баланс между частотой сохранений и производительностью.
        // [PLAN] 8.3. Сохранение и экспорт
        this.autoSaveInterval = 300;
        this.autoSaveTimer = 0;
        
        // [ЧТО] Ключ для хранения в localStorage.
        this.saveKey = 'weaveNetSave';
    }

    /**
     * [ЧТО] Обновление таймера автосохранения.
     * [ЗАЧЕМ] Вызывается каждый кадр для отсчёта времени до следующего сохранения.
     * @param {number} deltaTime - Время между кадрами в секундах
     * @param {number} speed - Множитель скорости игры
     */
    update(deltaTime, speed) {
        this.autoSaveTimer += deltaTime * speed;
        if (this.autoSaveTimer >= this.autoSaveInterval) {
            this.autoSave();
            this.autoSaveTimer = 0;
        }
    }

    /**
     * [ЧТО] Автоматическое сохранение текущего состояния игры.
     * [ЗАЧЕМ] Сохраняет прогресс игрока для предотвращения потери данных.
     * [PLAN] 8.3. Сохранение и экспорт
     */
    autoSave() {
        const gameState = this.serializeState();
        
        try {
            localStorage.setItem(this.saveKey, JSON.stringify(gameState));
            console.log('[AutoSave] Игра сохранена успешно');
        } catch (e) {
            console.error('[AutoSave] Ошибка сохранения:', e);
        }
    }

    /**
     * [ЧТО] Ручное сохранение в указанный слот.
     * [ЗАЧЕМ] Позволяет игроку создать точку восстановления по желанию.
     * @param {string} slotName - Имя слота сохранения
     * @returns {boolean} true если успешно
     */
    manualSave(slotName = 'manual') {
        const gameState = this.serializeState();
        const key = `${this.saveKey}_${slotName}`;
        
        try {
            localStorage.setItem(key, JSON.stringify(gameState));
            console.log(`[ManualSave] Сохранено в слот: ${slotName}`);
            return true;
        } catch (e) {
            console.error('[ManualSave] Ошибка сохранения:', e);
            return false;
        }
    }

    /**
     * [ЧТО] Загрузка последнего автосохранения.
     * [ЗАЧЕМ] Восстанавливает прогресс при запуске игры.
     * @returns {boolean} true если загрузка успешна
     */
    loadLastSave() {
        try {
            const savedData = localStorage.getItem(this.saveKey);
            if (!savedData) {
                console.log('[LoadGame] Нет сохраненных данных');
                return false;
            }

            const gameState = JSON.parse(savedData);
            this.deserializeState(gameState);
            
            console.log('[LoadGame] Игра загружена успешно');
            return true;
        } catch (e) {
            console.error('[LoadGame] Ошибка загрузки:', e);
            return false;
        }
    }

    /**
     * [ЧТО] Загрузка из указанного слота.
     * [ЗАЧЕМ] Позволяет выбрать конкретное сохранение.
     * @param {string} slotName - Имя слота
     * @returns {boolean} true если успешно
     */
    loadFromSlot(slotName) {
        const key = `${this.saveKey}_${slotName}`;
        try {
            const savedData = localStorage.getItem(key);
            if (!savedData) return false;
            
            const gameState = JSON.parse(savedData);
            this.deserializeState(gameState);
            return true;
        } catch (e) {
            console.error('[LoadSlot] Ошибка загрузки:', e);
            return false;
        }
    }

    /**
     * [ЧТО] Сериализация текущего состояния игры в объект.
     * [ЗАЧЕМ] Подготавливает данные для записи в localStorage или экспорта.
     * @returns {Object} Сериализованное состояние
     */
    serializeState() {
        const mapState = [];
        
        // Сохраняем только гексы с объектами для экономии места
        this.game.grid.map.forEach((hex, key) => {
            if (hex.object) {
                mapState.push({
                    key: key,
                    object: hex.object
                });
            }
        });

        return {
            info: this.game.economy.info,
            energy: this.game.economy.energy,
            gameTime: this.game.gameTime,
            offsetX: this.game.grid.offsetX,
            offsetY: this.game.grid.offsetY,
            zoom: this.game.grid.zoom,
            mapState: mapState
        };
    }

    /**
     * [ЧТО] Десериализация состояния и восстановление игры.
     * [ЗАЧЕМ] Применяет загруженные данные к текущей сессии.
     * @param {Object} gameState - Сериализованные данные
     */
    deserializeState(gameState) {
        // Восстановление ресурсов
        this.game.economy.setState(gameState.info, gameState.energy);
        this.game.gameTime = gameState.gameTime || 0;

        // Восстановление камеры
        this.game.grid.offsetX = gameState.offsetX || this.game.canvas.width / 2;
        this.game.grid.offsetY = gameState.offsetY || this.game.canvas.height / 2;
        this.game.grid.zoom = gameState.zoom || 1;

        // Восстановление объектов на карте
        if (gameState.mapState && Array.isArray(gameState.mapState)) {
            // Очищаем существующие объекты
            this.game.grid.map.forEach(hex => {
                hex.object = null;
            });

            // Восстанавливаем объекты
            gameState.mapState.forEach(savedHex => {
                const [q, r] = savedHex.key.split(',').map(Number);
                const hex = this.game.grid.getHex(q, r);
                if (hex) {
                    hex.object = savedHex.object;
                }
            });
        }

        // Инвалидация кэша покрытия
        this.game.renderer.invalidateCoverageCache();
        
        // Обновление UI
        this.game.updateUI();
    }

    /**
     * [ЧТО] Экспорт конфигурации в текстовый формат.
     * [ЗАЧЕМ] Позволяет поделиться расстановкой узлов или сохранить вне браузера.
     * [PLAN] 8.3. Сохранение и экспорт
     * @returns {string} JSON строка с состоянием
     */
    exportConfig() {
        return JSON.stringify(this.serializeState(), null, 2);
    }

    /**
     * [ЧТО] Импорт конфигурации из текстового формата.
     * [ЗАЧЕМ] Позволяет загрузить чужую конфигурацию или резервную копию.
     * @param {string} jsonString - JSON строка с состоянием
     * @returns {boolean} true если успешно
     */
    importConfig(jsonString) {
        try {
            const gameState = JSON.parse(jsonString);
            this.deserializeState(gameState);
            return true;
        } catch (e) {
            console.error('[ImportConfig] Ошибка импорта:', e);
            return false;
        }
    }

    /**
     * [ЧТО] Полный сброс прогресса.
     * [ЗАЧЕМ] Удаляет все сохранения для начала новой игры.
     */
    resetProgress() {
        try {
            localStorage.removeItem(this.saveKey);
            // Удаляем также ручные слоты
            for (let i = 0; i < 10; i++) {
                localStorage.removeItem(`${this.saveKey}_slot${i}`);
            }
            console.log('[ResetProgress] Прогресс сброшен');
        } catch (e) {
            console.error('[ResetProgress] Ошибка:', e);
        }
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaveManager;
}
