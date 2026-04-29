/**
 * CameraManager - Модуль управления камерой
 * [ЧТО] Управление панорамированием и зумом карты
 * [ЗАЧЕМ] Навигация по большой карте 200×200 гексов
 * [PLAN] Добавить ограничение на выход за границы карты
 */

class CameraManager {
    /**
     * Конструктор камеры
     * [ЧТО] Инициализация параметров камеры
     * [ЗАЧЕМ] Базовая настройка вида
     * [PLAN] Сохранение позиции камеры между сессиями
     */
    constructor(canvas, hexGrid) {
        // [ЧТО] Ссылка на canvas
        // [ЗАЧЕМ] Для получения размеров и координат
        this.canvas = canvas;
        
        // [ЧТО] Ссылка на сетку гексов
        // [ЗАЧЕМ] Для ограничения движения камеры
        this.hexGrid = hexGrid;
        
        // [ЧТО] Позиция камеры (смещение относительно центра)
        // [ЗАЧЕМ] Панорамирование по карте
        // [PLAN] Плавное движение камеры (lerp)
        this.offsetX = 0;
        this.offsetY = 0;
        
        // [ЧТО] Уровень зума (масштаб)
        // [ЗАЧЕМ] Приближение/отдаление карты
        // [PLAN] Ограничить мин/макс зум
        this.zoom = 1;
        this.minZoom = 0.05;
        this.maxZoom = 1.5;
        this.zoomSpeed = 0.1;
        
        // [ЧТО] Состояние перетаскивания
        // [ЗАЧEM] Отслеживание ЛКМ для панорамирования
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // [ЧТО] Режим камеры
        // [ЗАЧЕМ] Переключение между панорамированием и взаимодействием
        // [PLAN] Добавить режим "выделение области"
        this.mode = 'pan'; // 'pan' или 'interact'
        
        console.log('[CameraManager] Камера инициализирована');
    }
    
    /**
     * Настройка обработчиков событий
     * [ЧТО] Регистрирует обработчики мыши для управления камерой
     * [ЗАЧЕМ] Взаимодействие игрока с камерой
     * [PLAN] Добавить поддержку тач-устройств
     */
    setupEventListeners() {
        // [ЧТО] Обработка нажатия кнопки мыши
        // [ЗАЧЕМ] Начало перетаскивания карты
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // [ЧТО] Обработка отпускания кнопки мыши
        // [ЗАЧЕМ] Конец перетаскивания
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        
        // [ЧТО] Обработка движения мыши
        // [ЗАЧЕМ] Перетаскивание карты
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // [ЧТО] Обработка колёсика мыши
        // [ЗАЧЕМ] Зумирование карты
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // [ЧТО] Обработка ухода мыши с canvas
        // [ЗАЧЕМ] Сброс перетаскивания если мышь ушла
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        
        console.log('[CameraManager] Обработчики событий настроены');
    }
    
    /**
     * Обработка нажатия кнопки мыши
     * [ЧТО] Начинает перетаскивание при ЛКМ в режиме панорамирования
     * [ЗАЧЕМ] Управление камерой
     */
    handleMouseDown(e) {
        if (e.button === 0 && this.mode === 'pan') { // ЛКМ
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            console.log('[CameraManager] Начало перетаскивания');
        }
    }
    
    /**
     * Обработка отпускания кнопки мыши
     * [ЧТО] Завершает перетаскивание
     * [ЗАЧЕМ] Конец движения камеры
     */
    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
            console.log('[CameraManager] Конец перетаскивания');
        }
    }
    
    /**
     * Обработка движения мыши
     * [ЧТО] Перемещает камеру при перетаскивании
     * [ЗАЧЕМ] Панорамирование по карте
     */
    handleMouseMove(e) {
        if (this.isDragging && this.mode === 'pan') {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            this.offsetX += deltaX;
            this.offsetY += deltaY;
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            console.log(`[CameraManager] Панорамирование: offset(${this.offsetX}, ${this.offsetY})`);
        }
    }
    
    /**
     * Обработка ухода мыши с canvas
     * [ЧТО] Сбрасывает перетаскивание
     * [ЗАЧЕМ] Предотвращение зависания состояния
     */
    handleMouseLeave() {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        }
    }
    
    /**
     * Обработка колёсика мыши
     * [ЧТО] Изменяет уровень зума
     * [ЗАЧЕМ] Приближение/отдаление карты
     * [PLAN] Зум в точку курсора, а не в центр
     */
    handleWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -this.zoomSpeed : this.zoomSpeed;
        const newZoom = this.zoom + delta;
        
        // [ЧТО] Ограничиваем зум
        // [ЗАЧЕМ] Prevent слишком близкое/далёкое приближение
        if (newZoom >= this.minZoom && newZoom <= this.maxZoom) {
            this.zoom = newZoom;
            console.log(`[CameraManager] Зум: ${this.zoom.toFixed(2)}`);
        }
    }
    
    /**
     * Применение трансформации к контексту рисования
     * [ЧТО] Устанавливает transform для ctx
     * [ЗАЧЕМ] Все последующие рисунки будут с учётом камеры
     * [PLAN] Оптимизировать для производительности
     */
    applyTransform(ctx) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        ctx.save();
        ctx.translate(centerX + this.offsetX, centerY + this.offsetY);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-centerX, -centerY);
    }
    
    /**
     * Сброс трансформации
     * [ЧТО] Восстанавливает контекст
     * [ЗАЧЕМ] Для рисования UI элементов без трансформации
     */
    resetTransform(ctx) {
        ctx.restore();
    }
    
    /**
     * Переключение режима камеры
     * [ЧТО] Меняет режим между 'pan' и 'interact'
     * [ЗАЧЕМ] Разные режимы взаимодействия
     */
    toggleMode() {
        this.mode = this.mode === 'pan' ? 'interact' : 'pan';
        this.canvas.style.cursor = this.mode === 'pan' ? 'grab' : 'default';
        console.log(`[CameraManager] Режим переключён на: ${this.mode}`);
        return this.mode;
    }
    
    /**
     * Установка режима
     * [ЧТО] Устанавливает конкретный режим
     * [ЗАЧЕМ] Программное переключение
     */
    setMode(mode) {
        if (mode === 'pan' || mode === 'interact') {
            this.mode = mode;
            this.canvas.style.cursor = mode === 'pan' ? 'grab' : 'default';
            console.log(`[CameraManager] Режим установлен: ${this.mode}`);
        }
    }
    
    /**
     * Получение текущего режима
     * [ЧТО] Возвращает текущий режим
     * [ЗАЧЕМ] Для отображения в UI
     */
    getMode() {
        return this.mode;
    }
    
    /**
     * Сброс камеры к начальным значениям
     * [ЧТО] Возвращает камеру в центр с зумом 1x
     * [ЗАЧЕМ] Быстрый возврат к стандартному виду
     */
    reset() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1;
        console.log('[CameraManager] Камера сброшена');
    }
    
    /**
     * Центрирование на конкретном гексе
     * [ЧТО] Перемещает камеру к указанному гексу
     * [ЗАЧЕМ] Быстрая навигация
     * [PLAN] Анимация перемещения
     */
    centerOnHex(hex) {
        if (!hex) return;
        
        // [ЧТО] Вычисляем позицию гекса в пикселях
        // [ЗАЧЕМ] Для центрирования
        const hexWidth = this.hexGrid.getHexWidth();
        const hexHeight = this.hexGrid.getHexHeight();
        
        const hexPixelX = hexWidth * hex.q;
        const hexPixelY = hexHeight * (hex.r + hex.q / 2);
        
        // [ЧТО] Инвертируем смещение для центрирования
        // [ЗАЧЕМ] Гекс окажется в центре экрана
        this.offsetX = -hexPixelX;
        this.offsetY = -hexPixelY;
        
        console.log(`[CameraManager] Центрирование на гексе ${hex.id}`);
    }
    
    /**
     * Преобразование экранных координат в мировые с учётом камеры
     * [ЧТО] Конвертирует координаты мыши в координаты игрового мира
     * [ЗАЧЕМ] Для определения гекса под курсором с учётом зума и панорамирования
     */
    screenToWorld(screenX, screenY) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // [ЧТО] Учитываем смещение и зум
        // [ЗАЧЕМ] Получаем координаты в мире игры
        const worldX = (screenX - centerX - this.offsetX) / this.zoom + centerX;
        const worldY = (screenY - centerY - this.offsetY) / this.zoom + centerY;
        
        return { x: worldX, y: worldY };
    }
    
    /**
     * Получение текущего уровня зума
     * [ЧТО] Возвращает текущий зум
     * [ЗАЧЕМ] Для отображения в UI
     */
    getZoom() {
        return this.zoom;
    }
    
    /**
     * Получение текущего смещения
     * [ЧТО] Возвращает offsetX и offsetY
     * [ЗАЧЕМ] Для отладки и UI
     */
    getOffset() {
        return { x: this.offsetX, y: this.offsetY };
    }
}
