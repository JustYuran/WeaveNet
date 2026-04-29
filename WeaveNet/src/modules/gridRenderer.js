/**
 * GridRenderer - Модуль отрисовки гексагональной сетки и построек
 * [ЧТО] Рендерит 7 гексов, постройки и эффекты выделения
 * [ЗАЧЕМ] Визуализация игрового поля для взаимодействия с игроком
 * [PLAN] Добавить анимации, частицы и улучшения графики
 * 
 * [ERROR] Ошибка 2 - всплывающее окно при нажатии на гекс не работает -> ИСПРАВЛЕНО
 * [PLAN] Удалено контекстное меню, теперь панель построек сверху экрана
 */

class GridRenderer {
    /**
     * Конструктор рендерера
     * @param {HTMLCanvasElement} canvas - Canvas элемент для отрисовки
     * @param {HexGrid} hexGrid - Объект гексагональной сетки
     */
    constructor(canvas, hexGrid) {
        // [ЧТО] Инициализация canvas и контекста
        // [ЗАЧЕМ] Базовая настройка для отрисовки графики
        // [PLAN] Добавить поддержку DPI для ретина-дисплеев
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hexGrid = hexGrid;
        
        // [ЧТО] Текущий выбранный гекс (для подсветки)
        // [ЗАЧЕМ] Визуальная обратная связь при наведении
        // [PLAN] Добавить анимацию выделения
        this.selectedHexId = null;
        
        // [ЧТО] Тип постройки для режима строительства
        // [ЗАЧЕМ] Показывает какую постройку игрок хочет разместить
        // [PLAN] Добавить предпросмотр постройки перед размещением
        this.buildingTypeToPlace = null;
        
        // [ЧТО] Настройка размеров canvas
        // [ЗАЧЕМ] Корректное масштабирование под размер окна
        // [PLAN] Обработка изменения размера окна
        this.resizeCanvas();
        
        // [ЧТО] Привязка обработчика изменения размера
        // [ЗАЧЕМ] Адаптация под изменение размера окна браузера
        // [PLAN] Добавить debounce для производительности
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    /**
     * Изменение размера canvas под окно
     * [ЧТО] Устанавливает размеры canvas равными размеру окна
     * [ЗАЧЕМ] Игра занимает всё доступное пространство
     * [PLAN] Добавить полноэкранный режим
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        console.log(`[GridRenderer] Canvas resized to ${this.canvas.width}x${this.canvas.height}`);
    }
    
    /**
     * Основная функция отрисовки всего поля
     * [ЧТО] Очищает canvas и рисует все гексы и постройки
     * [ЗАЧЕМ] Обновление изображения каждый кадр
     * [PLAN] Оптимизировать перерисовку только изменённых областей
     */
    render() {
        // [ЧТО] Очистка всего canvas
        // [ЗАЧЕМ] Удаление предыдущего кадра перед отрисовкой нового
        // [PLAN] Использовать requestAnimationFrame для плавности
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // [ЧТО] Вычисляем центр экрана для центрирования карты
        // [ЗАЧЕМ] Карта всегда отображается по центру
        // [PLAN] Добавить камеру и панорамирование
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // [ЧТО] Получаем все гексы для отрисовки
        // [ЗАЧЕМ] Итерируемся по всем гексам сетки
        // [PLAN] Сортировать гексы для правильного порядка отрисовки
        const hexes = this.hexGrid.getAllHexes();
        
        // [ЧТО] Отрисовка каждого гекса
        // [ЗАЧЕМ] Показываем все гексы на поле
        // [PLAN] Добавить кэширование отрисованных гексов
        hexes.forEach(hex => {
            // [ЧТО] Вычисляем pixel-координаты центра гекса относительно центра экрана
            // [ЗАЧЕМ] Позиционируем гекс на экране
            // [PLAN] Использовать матричные преобразования для камеры
            
            // Для flat-top ориентации (плоская вершина):
            // Ширина гекса = sqrt(3) * size, Высота = 2 * size
            // Горизонтальное расстояние между центрами = width
            // Вертикальное расстояние между рядами = 3/4 * height
            const hexWidth = this.hexGrid.getHexWidth();
            const hexHeight = this.hexGrid.getHexHeight();
            
            // Конвертация axial координат (q, r) в pixel координаты
            // x = width * q
            // y = height * (r + q/2)
            hex.x = centerX + hexWidth * hex.q;
            hex.y = centerY + hexHeight * (hex.r + hex.q / 2);
            
            // [ЧТО] Рисуем гекс
            // [ЗАЧЕМ] Базовая визуализация гекса
            // [PLAN] Добавить текстуры местности
            this.drawHex(hex);
            
            // [ЧТО] Если на гексе есть постройка, рисуем её
            // [ЗАЧЕМ] Показываем построенные объекты
            // [PLAN] Добавить анимации построек
            if (hex.building) {
                this.drawBuilding(hex);
            }
        });
        
        // [ЧТО] Отрисовка курсора строительства если выбран тип постройки
        // [ЗАЧЕМ] Показывает где будет размещена постройка
        // [PLAN] Добавить проверку валидности позиции
        if (this.buildingTypeToPlace && this.selectedHexId !== null) {
            this.drawBuildCursor();
        }
    }
    
    /**
     * Отрисовка одного гекса
     * @param {Object} hex - Объект гекса с координатами
     */
    drawHex(hex) {
        const size = this.hexGrid.getHexSize();
        const isSelected = hex.id === this.selectedHexId;
        
        // [ЧТО] Начинаем путь для рисования шестиугольника
        // [ЗАЧЕМ] Создаём форму гекса из 6 вершин
        // [PLAN] Использовать Path2D для переиспользования пути
        this.ctx.beginPath();
        
        // [ЧТО] Вычисляем и добавляем 6 вершин гекса
        // [ЗАЧЕМ] Шестиугольная форма гекса
        // [PLAN] Предварительно вычислить вершины для производительности
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * (Math.PI / 180);
            const x = hex.x + size * Math.cos(angle);
            const y = hex.y + size * Math.sin(angle);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();
        
        // [ЧТО] Заполняем гекс цветом в зависимости от состояния
        // [ЗАЧЕМ] Визуальное различие между обычными и выделенными гексами
        // [PLAN] Добавить цвета для разных типов местности
        if (isSelected) {
            this.ctx.fillStyle = 'rgba(74, 158, 255, 0.3)'; // Синий для выделенного
        } else {
            this.ctx.fillStyle = 'rgba(100, 100, 100, 0.2)'; // Серый для обычного
        }
        this.ctx.fill();
        
        // [ЧТО] Рисуем контур гекса
        // [ЗАЧЕМ] Чёткие границы между гексами
        // [PLAN] Разная толщина для разных состояний
        if (isSelected) {
            this.ctx.strokeStyle = '#4a9eff';
            this.ctx.lineWidth = 3;
        } else {
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
            this.ctx.lineWidth = 1;
        }
        this.ctx.stroke();
    }
    
    /**
     * Отрисовка постройки на гексе
     * @param {Object} hex - Гекс с постройкой
     */
    drawBuilding(hex) {
        const building = hex.building;
        const size = this.hexGrid.getHexSize() * 0.6;
        
        // [ЧТО] Рисуем прямоугольник постройки в центре гекса
        // [ЗАЧЕМ] Визуализация построенного объекта
        // [PLAN] Использовать спрайты или иконки для разных типов
        this.ctx.fillStyle = building.color || '#4ade80';
        this.ctx.fillRect(
            hex.x - size / 2,
            hex.y - size / 2,
            size,
            size
        );
        
        // [ЧТО] Добавляем текст с названием постройки
        // [ЗАЧЕМ] Идентификация типа постройки
        // [PLAN] Добавить уровни и индикаторы состояния
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(building.name, hex.x, hex.y);
    }
    
    /**
     * Отрисовка курсора строительства
     * [ЧТО] Показывает preview постройки на выбранном гексе
     * [ЗАЧЕМ] Игрок видит куда разместится постройка
     * [PLAN] Добавить красный цвет если размещение невозможно
     */
    drawBuildCursor() {
        const hex = this.hexGrid.getHexById(this.selectedHexId);
        if (!hex || hex.building) return;
        
        const size = this.hexGrid.getHexSize() * 0.6;
        
        // [ЧТО] Рисуем полупрозрачный прямоугольник
        // [ЗАЧЕМ] Preview места размещения постройки
        // [PLAN] Анимировать пульсацию для привлечения внимания
        this.ctx.fillStyle = 'rgba(74, 158, 255, 0.5)';
        this.ctx.fillRect(
            hex.x - size / 2,
            hex.y - size / 2,
            size,
            size
        );
        
        // [ЧТО] Рисуем контур
        // [ЗАЧЕМ] Чёткие границы зоны размещения
        // [PLAN] Добавить пунктирную линию
        this.ctx.strokeStyle = '#4a9eff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(
            hex.x - size / 2,
            hex.y - size / 2,
            size,
            size
        );
        this.ctx.setLineDash([]);
    }
    
    /**
     * Установка выбранного гекса
     * @param {number|null} hexId - ID гекса или null для снятия выделения
     */
    setSelectedHex(hexId) {
        this.selectedHexId = hexId;
    }
    
    /**
     * Получение выбранного гекса
     * @returns {number|null} ID выбранного гекса
     */
    getSelectedHex() {
        return this.selectedHexId;
    }
    
    /**
     * Установка типа постройки для размещения
     * @param {Object|null} buildingType - Объект типа постройки или null для отмены
     */
    setBuildingTypeToPlace(buildingType) {
        this.buildingTypeToPlace = buildingType;
    }
    
    /**
     * Получение типа постройки для размещения
     * @returns {Object|null} Тип постройки
     */
    getBuildingTypeToPlace() {
        return this.buildingTypeToPlace;
    }
    
    /**
     * Преобразование координат мыши в ID гекса
     * @param {number} mouseX - X координата мыши
     * @param {number} mouseY - Y координата мыши
     * @returns {number|null} ID гекса под курсором или null
     */
    getHexAtPosition(mouseX, mouseY) {
        const hexes = this.hexGrid.getAllHexes();
        const size = this.hexGrid.getHexSize();
        
        // [ЧТО] Проверяем каждый гекс на попадание точки
        // [ЗАЧЕМ] Определение гекса под курсором мыши
        // [PLAN] Использовать более эффективный алгоритм поиска
        for (const hex of hexes) {
            const dx = mouseX - hex.x;
            const dy = mouseY - hex.y;
            
            // [ЧТО] Простая проверка по расстоянию до центра
            // [ЗАЧЕМ] Быстрое определение попадания в гекс
            // [PLAN] Использовать точную проверку внутри шестиугольника
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= size * 0.9) {
                return hex.id;
            }
        }
        
        return null;
    }
    
    /**
     * Очистка рендерера
     * [ЧТО] Сброс всех состояний
     * [ЗАЧЕМ] Подготовка к удалению или перезапуску
     * [PLAN] Добавить деструктор для очистки event listeners
     */
    destroy() {
        this.selectedHexId = null;
        this.buildingTypeToPlace = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// [ЧТО] Экспорт класса для использования в других модулях
// [ЗАЧЕМ] Модульная архитектура требует явного экспорта
// [PLAN] Использовать ES6 modules в будущем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridRenderer;
}
