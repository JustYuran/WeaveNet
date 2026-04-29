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
     * @param {CameraManager} cameraManager - Менеджер камеры (опционально)
     */
    constructor(canvas, hexGrid, cameraManager = null) {
        // [ЧТО] Инициализация canvas и контекста
        // [ЗАЧЕМ] Базовая настройка для отрисовки графики
        // [PLAN] Добавить поддержку DPI для ретина-дисплеев
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hexGrid = hexGrid;
        this.cameraManager = cameraManager;
        
        // [ЧТО] Текущий выбранный гекс (для подсветки)
        // [ЗАЧЕМ] Визуальная обратная связь при наведении
        // [PLAN] Добавить анимацию выделения
        this.selectedHexId = null;
        
        // [ЧТО] Гекс под курсором мыши (для hover эффекта)
        // [ЗАЧЕМ] Подсветка гекса при наведении
        // [PLAN] Использовать для tooltip
        this.hoveredHexId = null;
        
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
        
        // [ЧТО] Применяем трансформацию камеры если она есть
        // [ЗАЧЕМ] Панорамирование и зум карты
        if (this.cameraManager) {
            this.cameraManager.applyTransform(this.ctx);
        }
        
        // [ЧТО] Вычисляем центр экрана для центрирования карты
        // [ЗАЧЕМ] Карта всегда отображается по центру
        // [PLAN] Использовать камеру для позиционирования
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
            
            // [ЧТО] Если на гексе есть преграда, рисуем её
            // [ЗАЧЕМ] 1.3.1 - Визуализация гор, пропастей и воды
            // [PLAN] 1.3.2 - Добавить анимации для преград
            if (hex.obstacle) {
                this.drawObstacle(hex);
            }
            
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
        if (this.buildingTypeToPlace && this.hoveredHexId !== null) {
            this.drawBuildCursor();
        }
        
        // [ЧТО] Сбрасываем трансформацию камеры для UI элементов
        // [ЗАЧЕМ] Курсор и другие UI элементы рисуются без трансформации
        if (this.cameraManager) {
            this.cameraManager.resetTransform(this.ctx);
        }
        
        // [ЧТО] Отрисовка пользователей на гексах
        // [ЗАЧЕМ] Показываем активных пользователей на карте
        // [PLAN] Добавить анимацию движения
        if (this.userManager) {
            this.drawUsers();
        }
    }
    
    /**
     * Отрисовка одного гекса
     * @param {Object} hex - Объект гекса с координатами
     */
    drawHex(hex) {
        const size = this.hexGrid.getHexSize();
        const isSelected = hex.id === this.selectedHexId;
        const isHovered = hex.id === this.hoveredHexId;
        
        // [ЧТО] Определяем силу подсветки в зависимости от состояния
        // [ЗАЧЕМ] Hover - 25% силы, Selected - 100% силы
        // [PLAN] Добавить плавные переходы
        let highlightIntensity = 0;
        if (isSelected) {
            highlightIntensity = 1.0;
        } else if (isHovered) {
            highlightIntensity = 0.25;
        }
        
        // [ЧТО] Получаем цвет местности для гекса
        // [ЗАЧЕМ] Визуальное различие биомов (равнина, пустыня, снег)
        // [PLAN] Добавить текстуры для каждого биома
        const terrainColor = this.getTerrainColor(hex.terrain);
        
        // [ЧТО] Рисуем свечение для выделенного гекса
        // [ЗАЧЕМ] Визуальный эффект выделения
        // [PLAN] Добавить анимацию пульсации
        if (highlightIntensity > 0) {
            this.ctx.save();
            this.ctx.shadowColor = '#4a9eff';
            this.ctx.shadowBlur = 20 * highlightIntensity;
            this.ctx.beginPath();
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
            this.ctx.fillStyle = `rgba(74, 158, 255, ${0.4 * highlightIntensity})`;
            this.ctx.fill();
            this.ctx.restore();
        }
        
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
        
        // [ЧТО] Заполняем гекс цветом местности с учётом выделения
        // [ЗАЧЕМ] Визуальное различие между биомами и состояниями
        // [PLAN] Добавить текстуры и узоры для каждого биома
        if (isSelected) {
            // Выделенный гекс - синий оттенок поверх цвета местности
            this.ctx.fillStyle = this.blendColors(terrainColor, '#4a9eff', 0.5);
        } else if (isHovered) {
            // Hover - слегка осветлённый цвет местности
            this.ctx.fillStyle = this.lightenColor(terrainColor, 0.2);
        } else {
            // Обычный гекс - базовый цвет местности
            this.ctx.fillStyle = terrainColor;
        }
        this.ctx.fill();
        
        // [ЧТО] Рисуем контур гекса
        // [ЗАЧЕМ] Чёткие границы между гексами
        // [PLAN] Разная толщина для разных состояний
        if (isSelected) {
            this.ctx.strokeStyle = '#4a9eff';
            this.ctx.lineWidth = 3;
        } else if (isHovered) {
            this.ctx.strokeStyle = '#4a9eff';
            this.ctx.lineWidth = 2;
        } else {
            this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
            this.ctx.lineWidth = 1;
        }
        this.ctx.stroke();
    }
    
    /**
     * Получение цвета для типа местности
     * @param {string} terrain - Тип местности ('plains', 'desert', 'snow')
     * @returns {string} HEX цвет
     */
    getTerrainColor(terrain) {
        // [ЧТО] Возвращаем цвет для каждого биома
        // [ЗАЧЕМ] Визуальное различие типов местности
        // [PLAN] Добавить больше биомов и вариаций
        const terrainColors = {
            'plains': '#4a7c23',    // Зелёная равнина
            'desert': '#d2b48c',    // Песочная пустыня
            'snow': '#e8f4f8'       // Белоснежные пустоши
        };
        return terrainColors[terrain] || '#4a7c23'; // По умолчанию равнина
    }
    
    /**
     * Получение цвета для преграды рельефа
     * @param {string|null} obstacle - Тип преграды (null, 'mountain', 'chasm', 'water')
     * @returns {string} HEX цвет или null если преграды нет
     * 
     * [ЧТО] Возвращает цвет для визуализации преграды
     * [ЗАЧЕМ] 1.3.1 - Визуальное выделение гор, пропастей и воды
     * [PLAN] 1.3.2 - Добавить текстуры и иконки для преград
     */
    getObstacleColor(obstacle) {
        if (!obstacle) return null;
        
        const obstacleColors = {
            'mountain': '#5a5a6a',  // Серые горы с синим оттенком
            'chasm': '#2d2d3a',     // Тёмная пропасть
            'water': '#4a9eff'      // Голубая вода
        };
        return obstacleColors[obstacle] || null;
    }
    
    /**
     * Отрисовка преграды на гексе
     * @param {Object} hex - Объект гекса с преградой
     * 
     * [ЧТО] Рисует визуальное представление преграды (горы, пропасти, воды)
     * [ЗАЧЕМ] 1.3.1 - Игрок видит непроходимые участки карты
     * [PLAN] 1.3.2 - Добавить 3D эффект для гор, анимацию для воды
     */
    drawObstacle(hex) {
        if (!hex.obstacle) return;
        
        const size = this.hexGrid.getHexSize();
        const obstacleColor = this.getObstacleColor(hex.obstacle);
        
        if (!obstacleColor) return;
        
        // [ЧТО] Рисуем преграду поверх цвета местности
        // [ЗАЧЕМ] Визуальное выделение непроходимых гексов
        // [PLAN] 1.3.1 - Разные стили для разных типов преград
        
        if (hex.obstacle === 'mountain') {
            // [ЧТО] Горы - рисуем треугольную "вершину" в центре
            // [ЗАЧЕМ] Ассоциация с горной вершиной
            // [PLAN] Добавить градиент для объёма
            this.ctx.fillStyle = obstacleColor;
            this.ctx.beginPath();
            const mountainSize = size * 0.6;
            this.ctx.moveTo(hex.x, hex.y - mountainSize * 0.8);
            this.ctx.lineTo(hex.x - mountainSize * 0.7, hex.y + mountainSize * 0.4);
            this.ctx.lineTo(hex.x + mountainSize * 0.7, hex.y + mountainSize * 0.4);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Добавляем светлую вершину (снег на вершине)
            this.ctx.fillStyle = '#a8a8b8';
            this.ctx.beginPath();
            this.ctx.moveTo(hex.x, hex.y - mountainSize * 0.8);
            this.ctx.lineTo(hex.x - mountainSize * 0.25, hex.y - mountainSize * 0.2);
            this.ctx.lineTo(hex.x + mountainSize * 0.25, hex.y - mountainSize * 0.2);
            this.ctx.closePath();
            this.ctx.fill();
            
        } else if (hex.obstacle === 'chasm') {
            // [ЧТО] Пропасть - тёмная область с рваными краями
            // [ЗАЧЕМ] Визуализация разлома/пустоты
            // [PLAN] Добавить зияющий эффект
            this.ctx.fillStyle = obstacleColor;
            this.ctx.beginPath();
            const chasmSize = size * 0.5;
            
            // Рисуем несколько неровных полигонов для эффекта разлома
            for (let i = 0; i < 3; i++) {
                const offsetX = (i - 1) * chasmSize * 0.6;
                const offsetY = (Math.random() - 0.5) * chasmSize * 0.3;
                this.ctx.ellipse(
                    hex.x + offsetX,
                    hex.y + offsetY,
                    chasmSize * 0.4,
                    chasmSize * 0.25,
                    Math.random() * Math.PI,
                    0,
                    Math.PI * 2
                );
            }
            this.ctx.fill();
            
            // Тени по краям
            this.ctx.strokeStyle = '#1a1a2a';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
        } else if (hex.obstacle === 'water') {
            // [ЧТО] Вода - полупрозрачная синяя поверхность с волнами
            // [ЗАЧЕМ] Визуализация водной преграды
            // [PLAN] Анимировать волны
            this.ctx.fillStyle = 'rgba(74, 158, 255, 0.6)';
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * 60) * (Math.PI / 180);
                const x = hex.x + size * 0.7 * Math.cos(angle);
                const y = hex.y + size * 0.7 * Math.sin(angle);
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            // Рисуем волны
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.lineWidth = 1.5;
            const waveCount = 3;
            for (let w = 0; w < waveCount; w++) {
                const waveY = hex.y - size * 0.3 + w * size * 0.3;
                this.ctx.beginPath();
                for (let wx = 0; wx < size * 1.2; wx += 5) {
                    const waveX = hex.x - size * 0.5 + wx;
                    const waveOffset = Math.sin(wx * 0.1 + w) * 3;
                    if (wx === 0) {
                        this.ctx.moveTo(waveX, waveY + waveOffset);
                    } else {
                        this.ctx.lineTo(waveX, waveY + waveOffset);
                    }
                }
                this.ctx.stroke();
            }
        }
    }
    
    /**
     * Осветление HEX цвета
     * @param {string} color - HEX цвет
     * @param {number} amount - Степень осветления (0-1)
     * @returns {string} Осветлённый HEX цвет
     */
    lightenColor(color, amount) {
        // [ЧТО] Преобразуем HEX в RGB, осветляем и возвращаем в HEX
        // [ЗАЧЕМ] Динамическая генерация оттенков для hover эффекта
        // [PLAN] Кэшировать результаты для производительности
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        const lightenedR = Math.min(255, Math.floor(r + (255 - r) * amount));
        const lightenedG = Math.min(255, Math.floor(g + (255 - g) * amount));
        const lightenedB = Math.min(255, Math.floor(b + (255 - b) * amount));
        
        return `rgb(${lightenedR}, ${lightenedG}, ${lightenedB})`;
    }
    
    /**
     * Смешивание двух HEX цветов
     * @param {string} color1 - Первый HEX цвет
     * @param {string} color2 - Второй HEX цвет
     * @param {number} ratio - Пропорция смешивания (0-1, где 0=color1, 1=color2)
     * @returns {string} Смешанный HEX цвет
     */
    blendColors(color1, color2, ratio) {
        // [ЧТО] Преобразуем оба цвета в RGB, смешиваем и возвращаем в HEX
        // [ЗАЧЕМ] Создание переходных цветов для выделения на фоне местности
        // [PLAN] Оптимизировать для частых вызовов
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.floor(r1 + (r2 - r1) * ratio);
        const g = Math.floor(g1 + (g2 - g1) * ratio);
        const b = Math.floor(b1 + (b2 - b1) * ratio);
        
        return `rgb(${r}, ${g}, ${b})`;
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
     * Отрисовка курсора строительства (призрак постройки)
     * [ЧТО] Показывает preview постройки на гексе под курсором
     * [ЗАЧЕМ] Игрок видит куда разместится постройка и что будет строиться
     * [PLAN] Добавить красный цвет если размещение невозможно
     */
    drawBuildCursor() {
        const hex = this.hexGrid.getHexById(this.hoveredHexId);
        if (!hex || hex.building) return;
        
        const size = this.hexGrid.getHexSize() * 0.6;
        const buildingType = this.buildingTypeToPlace;
        
        // [ЧТО] Рисуем полупрозрачный прямоугольник "призрака" постройки
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
        
        // [ЧТО] Рисуем иконку/название постройки внутри призрака
        // [ЗАЧЕМ] Игрок видит что именно будет построено
        // [PLAN] Использовать иконки вместо текста
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(buildingType.name, hex.x, hex.y);
        
        // [ЧТО] Рисуем стоимость в углу
        // [ЗАЧЕМ] Игрок видит стоимость строительства
        // [PLAN] Показать достаточно ли ресурсов
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`${buildingType.cost}`, hex.x, hex.y + size/2 + 12);
    }
    
    /**
     * Установка выбранного гекса
     * @param {number|null} hexId - ID гекса или null для снятия выделения
     */
    setSelectedHex(hexId) {
        this.selectedHexId = hexId;
    }
    
    /**
     * Установка гекса под курсором (hover)
     * @param {number|null} hexId - ID гекса или null
     */
    setHoveredHex(hexId) {
        this.hoveredHexId = hexId;
    }
    
    /**
     * Получение выбранного гекса
     * @returns {number|null} ID выбранного гекса
     */
    getSelectedHex() {
        return this.selectedHexId;
    }
    
    /**
     * Получение гекса под курсором
     * @returns {number|null} ID гекса под курсором
     */
    getHoveredHex() {
        return this.hoveredHexId;
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
        // [ЧТО] Преобразуем экранные координаты в мировые если есть камера
        // [ЗАЧЕМ] Учёт зума и панорамирования для правильного определения гекса
        let worldX = mouseX;
        let worldY = mouseY;
        
        if (this.cameraManager) {
            const worldPos = this.cameraManager.screenToWorld(mouseX, mouseY);
            worldX = worldPos.x;
            worldY = worldPos.y;
        }
        
        const hexes = this.hexGrid.getAllHexes();
        const size = this.hexGrid.getHexSize();
        
        // [ЧТО] Проверяем каждый гекс на попадание точки
        // [ЗАЧЕМ] Определение гекса под курсором мыши
        // [PLAN] Использовать более эффективный алгоритм поиска
        for (const hex of hexes) {
            const dx = worldX - hex.x;
            const dy = worldY - hex.y;
            
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
     * Отрисовка пользователей на гексах
     * [ЧТО] Рисует кружки пользователей в центре каждого гекса
     * [ЗАЧЕМ] Визуализация активных пользователей на карте
     * [PLAN] Добавить анимацию движения, разные типы пользователей
     */
    drawUsers() {
        // [ЧТО] Проверяем наличие userManager
        // [ЗАЧЕМ] Защита от ошибок если userManager не инициализирован
        // [PLAN] Сделать userManager обязательным параметром конструктора
        if (!this.userManager) {
            console.warn('[GridRenderer.drawUsers] userManager не установлен');
            return;
        }
        
        const users = this.userManager.getAllUsers();
        
        // [ЧТО] Логируем количество пользователей для отладки
        // [ЗАЧЕМ] Помогает понять генерируются ли пользователи
        if (users.length > 0) {
            console.log(`[GridRenderer.drawUsers] Отрисовка ${users.length} пользователей`);
        }
        
        // [ЧТО] Группируем пользователей по гексам для отрисовки
        // [ЗАЧЕМ] Эффективная отрисовка всех пользователей
        // [PLAN] Оптимизировать для большого количества пользователей
        const hexUserMap = {};
        
        users.forEach(user => {
            // [ЧТО] Преобразуем hexId к строке для использования как ключ объекта
            // [ЗАЧЕМ] Ключи объекта всегда строки, нужна консистентность
            const hexKey = String(user.hexId);
            if (!hexUserMap[hexKey]) {
                hexUserMap[hexKey] = [];
            }
            hexUserMap[hexKey].push(user);
        });
        
        // [ЧТО] Отрисовываем пользователей на каждом гексе
        // [ЗАЧЕМ] Показываем всех пользователей на карте
        // [PLAN] Добавить layout для красивого расположения (сетка, круг)
        Object.keys(hexUserMap).forEach(hexKey => {
            // [ЧТО] Преобразуем ключ обратно в число для поиска гекса
            // [ЗАЧЕМ] getHexById ожидает числовой ID
            const hexId = parseInt(hexKey, 10);
            const hex = this.hexGrid.getHexById(hexId);
            
            // [ЧТО] Пропускаем отрисовку если гекс не найден
            // [ЗАЧЕМ] Защита от ошибок при несуществующих гексах
            if (!hex) {
                console.warn(`[GridRenderer.drawUsers] Гекс #${hexId} не найден`);
                return;
            }
            
            const usersOnHex = hexUserMap[hexKey];
            const userCount = usersOnHex.length;
            
            // [ЧТО] Вычисляем размер кружка пользователя
            // [ЗАЧЕМ] Чтобы все помещались на гексе
            // [PLAN] Динамический размер в зависимости от количества
            const baseSize = this.hexGrid.getHexSize() * 0.25;
            const maxPerRow = Math.ceil(Math.sqrt(userCount));
            const userSize = Math.min(baseSize, (this.hexGrid.getHexWidth() * 0.8) / maxPerRow);
            
            // [ЧТО] Распределяем пользователей сеткой на гексе
            // [ЗАЧЕМ] Равномерное расположение
            // [PLAN] Использовать гексагональную упаковку для красоты
            usersOnHex.forEach((user, index) => {
                // Простая сетка 3x3 максимум
                const row = Math.floor(index / 3);
                const col = index % 3;
                
                const offsetX = (col - 1) * userSize * 1.2;
                const offsetY = (row - 1) * userSize * 1.2;
                
                // [ЧТО] Рисуем кружок пользователя
                // [ЗАЧЕМ] Визуальное представление пользователя
                // [PLAN] Добавить аватарки или иконки
                this.ctx.beginPath();
                this.ctx.arc(
                    hex.x + offsetX,
                    hex.y + offsetY,
                    userSize * 0.8,
                    0,
                    Math.PI * 2
                );
                
                // [ЧТО] Используем цвет статуса вместо случайного цвета
                // [ЗАЧЕМ] 2.1.2 - Визуальное отображение статуса цветом
                // [PLAN] Добавить анимацию пульсации для активных статусов
                this.ctx.fillStyle = this.userManager.getStatusColor(user.status);
                this.ctx.fill();
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            });
        });
    }
    
    /**
     * Очистка рендерера
     * [ЧТО] Сброс всех состояний
     * [ЗАЧЕМ] Подготовка к удалению или перезапуску
     * [PLAN] Добавить деструктор для очистки event listeners
     */
    destroy() {
        this.selectedHexId = null;
        this.hoveredHexId = null;
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
