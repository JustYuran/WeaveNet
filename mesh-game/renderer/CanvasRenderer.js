/**
 * Рендерер для Canvas
 */
export class CanvasRenderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    
    // Настройки вида
    this.viewMode = 'default'; // default, coverage, latency, load
    this.showGrid = true;
    this.showRadius = true;
    
    // Состояние мыши
    this.mouseX = 0;
    this.mouseY = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    this.setupInteraction();
  }

  /**
   * Настройка взаимодействия
   */
  setupInteraction() {
    // Движение мыши
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      
      // Перемещение камеры
      if (this.isDragging) {
        const dx = this.mouseX - this.lastMouseX;
        const dy = this.mouseY - this.lastMouseY;
        
        this.game.state.camera.x += dx;
        this.game.state.camera.y += dy;
      }
      
      this.lastMouseX = this.mouseX;
      this.lastMouseY = this.mouseY;
      
      // Определение узла под курсором
      this.updateHoverNode();
    });
    
    // Нажатие кнопки мыши
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Левая кнопка
        this.isDragging = true;
        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;
      }
    });
    
    // Отпускание кнопки мыши
    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDragging = false;
      }
    });
    
    // Колесо мыши (зум)
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const zoomSpeed = 0.001;
      const delta = -e.deltaY * zoomSpeed;
      const oldZoom = this.game.state.camera.zoom;
      let newZoom = oldZoom + delta * oldZoom;
      
      // Ограничение зума
      newZoom = Math.max(0.5, Math.min(3, newZoom));
      
      // Зум к курсору
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const worldX = (mouseX - this.game.state.camera.x) / oldZoom;
      const worldY = (mouseY - this.game.state.camera.y) / oldZoom;
      
      this.game.state.camera.x = mouseX - worldX * newZoom;
      this.game.state.camera.y = mouseY - worldY * newZoom;
      this.game.state.camera.zoom = newZoom;
    }, { passive: false });
    
    // Клик по узлу
    this.canvas.addEventListener('click', (e) => {
      if (!this.isDragging && Math.abs(this.mouseX - this.lastMouseX) < 5 && 
          Math.abs(this.mouseY - this.lastMouseY) < 5) {
        this.handleClick(e);
      }
    });
    
    // Контекстное меню (удаление узла)
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleRightClick(e);
    });
  }

  /**
   * Обновление узла под курсором
   */
  updateHoverNode() {
    const network = this.game.state.network;
    if (!network) return;
    
    const worldX = (this.mouseX - this.game.state.camera.x) / this.game.state.camera.zoom;
    const worldY = (this.mouseY - this.game.state.camera.y) / this.game.state.camera.zoom;
    
    let hoveredNode = null;
    
    for (const node of network.nodes) {
      const dist = Math.hypot(node.x - worldX, node.y - worldY);
      if (dist <= 15) { // Радиус клика
        hoveredNode = node;
        break;
      }
    }
    
    // Сброс предыдущего hover
    if (this.game.state.hoverNode) {
      this.game.state.hoverNode.hovered = false;
    }
    
    // Установка нового hover
    this.game.state.hoverNode = hoveredNode;
    if (hoveredNode) {
      hoveredNode.hovered = true;
    }
  }

  /**
   * Обработка левого клика
   */
  handleClick(e) {
    const network = this.game.state.network;
    if (!network) return;
    
    const worldX = (this.mouseX - this.game.state.camera.x) / this.game.state.camera.zoom;
    const worldY = (this.mouseY - this.game.state.camera.y) / this.game.state.camera.zoom;
    
    // Клик по узлу - выделение
    if (this.game.state.hoverNode) {
      // Сброс предыдущего выделения
      if (this.game.state.selectedNode) {
        this.game.state.selectedNode.selected = false;
      }
      
      this.game.state.selectedNode = this.game.state.hoverNode;
      this.game.state.hoverNode.selected = true;
      
      // Отправка события UI
      if (this.onNodeSelect) {
        this.onNodeSelect(this.game.state.hoverNode);
      }
    } else {
      // Клик по пустому месту - добавление узла (если выбран тип)
      if (this.game.pendingNodeType) {
        this.game.addNode(this.mouseX, this.mouseY, this.game.pendingNodeType);
        this.game.pendingNodeType = null;
        
        if (this.onNodeAdded) {
          this.onNodeAdded();
        }
      }
    }
  }

  /**
   * Обработка правого клика
   */
  handleRightClick(e) {
    const network = this.game.state.network;
    if (!network || !this.game.state.hoverNode) return;
    
    // Удаление узла
    const nodeId = this.game.state.hoverNode.id;
    
    if (this.game.state.selectedNode === this.game.state.hoverNode) {
      this.game.state.selectedNode.selected = false;
      this.game.state.selectedNode = null;
    }
    
    this.game.removeNode(nodeId);
    
    if (this.onNodeRemoved) {
      this.onNodeRemoved(nodeId);
    }
  }

  /**
   * Полная перерисовка
   */
  render() {
    // Вызов рендера игры (теперь включает отрисовку тепловых карт)
    this.game.render();
  }

  /**
   * Установка режима отображения
   */
  setViewMode(mode) {
    this.viewMode = mode;
    // Сообщаем игре о смене режима
    if (this.game.setViewMode) {
      this.game.setViewMode(mode);
    }
  }

  /**
   * Переключение сетки
   */
  toggleGrid() {
    this.showGrid = !this.showGrid;
  }
}
