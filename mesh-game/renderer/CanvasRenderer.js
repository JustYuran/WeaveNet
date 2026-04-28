/**
 * Рендерер для отрисовки на Canvas
 * Отвечает за визуализацию сети, узлов, пакетов и эффектов
 */
export class CanvasRenderer {
  constructor(canvas, network) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.network = network;
    
    // Режимы просмотра: default, coverage, latency, load
    this.viewMode = 'default';
    
    // Настройки отрисовки
    this.showRadius = false;
    this.showConnections = true;
    this.showPackets = true;
    this.showGrid = true;
    
    // Цвета
    this.colors = {
      background: '#16213e',
      grid: 'rgba(255, 255, 255, 0.05)',
      nodeBasic: '#00ff88',
      nodeRelay: '#00ccff',
      nodeCache: '#ffaa00',
      nodeStealth: '#aa00ff',
      nodeOverloaded: '#ff4400',
      nodeOffline: '#ff0000',
      edgeActive: 'rgba(0, 255, 136, 0.3)',
      edgeWeak: 'rgba(255, 170, 0, 0.3)',
      edgeInactive: 'rgba(255, 0, 0, 0.2)',
      packet: '#ffffff',
      obstacle: '#2a2a4a',
      jammer: 'rgba(255, 0, 100, 0.2)',
      jammerBorder: 'rgba(255, 0, 100, 0.5)'
    };
  }

  /**
   * Основная функция отрисовки
   */
  render() {
    this.clear();
    
    if (this.showGrid) {
      this.renderGrid();
    }
    
    this.renderObstacles();
    this.renderJammerZones();
    
    if (this.viewMode === 'coverage') {
      this.renderCoverageHeatmap();
    }
    
    if (this.showConnections) {
      this.renderEdges();
    }
    
    if (this.viewMode === 'load') {
      this.renderLoadHeatmap();
    }
    
    this.renderNodes();
    
    if (this.showPackets) {
      this.renderPackets();
    }
    
    this.renderSelection();
  }

  /**
   * Очистка canvas
   */
  clear() {
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Отрисовка сетки
   */
  renderGrid() {
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;
    
    const gridSize = 50;
    
    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Отрисовка препятствий
   */
  renderObstacles() {
    if (!this.network.obstacles) return;
    
    this.ctx.fillStyle = this.colors.obstacle;
    
    for (const obstacle of this.network.obstacles) {
      this.ctx.beginPath();
      this.ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Обводка
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  /**
   * Отрисовка зон помех
   */
  renderJammerZones() {
    if (!this.network.jammerZones || this.network.jammerZones.length === 0) return;
    
    for (const zone of this.network.jammerZones) {
      // Заполнение
      this.ctx.fillStyle = this.colors.jammer;
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Граница с анимацией
      this.ctx.strokeStyle = this.colors.jammerBorder;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.lineDashOffset = -Date.now() / 50;
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  /**
   * Отрисовка соединений (ребер)
   */
  renderEdges() {
    for (const edge of this.network.edges) {
      if (!edge.active) continue;
      
      const strength = edge.strength;
      
      // Выбор цвета в зависимости от силы соединения
      let color;
      if (strength > 0.7) {
        color = this.colors.edgeActive;
      } else if (strength > 0.4) {
        color = this.colors.edgeWeak;
      } else {
        color = this.colors.edgeInactive;
      }
      
      // Толщина линии зависит от нагрузки
      const lineWidth = 1 + edge.load * 3;
      
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth;
      this.ctx.lineCap = 'round';
      
      this.ctx.beginPath();
      this.ctx.moveTo(edge.nodeA.x, edge.nodeA.y);
      this.ctx.lineTo(edge.nodeB.x, edge.nodeB.y);
      this.ctx.stroke();
    }
  }

  /**
   * Отрисовка узлов
   */
  renderNodes() {
    for (const node of this.network.nodes) {
      const typeConfig = this.network.config.nodeTypes[node.type];
      let baseColor = this.colors[`node${node.type.charAt(0).toUpperCase() + node.type.slice(1)}`];
      
      if (!baseColor) {
        baseColor = this.colors.nodeBasic;
      }
      
      // Изменение цвета в зависимости от статуса
      let color = baseColor;
      if (node.status === 'overloaded') {
        color = this.colors.nodeOverloaded;
      } else if (node.status === 'offline') {
        color = this.colors.nodeOffline;
      }
      
      // Радиус узла
      const radius = node.status === 'offline' ? 6 : 8;
      
      // Внешний круг (основной)
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Свечение
      const gradient = this.ctx.createRadialGradient(
        node.x, node.y, radius,
        node.x, node.y, radius * 2
      );
      gradient.addColorStop(0, color + '66');
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, radius * 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Отображение радиуса действия при наведении или выделении
      if (node.hovered || node.selected || this.showRadius) {
        this.ctx.strokeStyle = color + '44';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.getEffectiveRadius(), 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
      
      // Индикатор нагрузки
      if (node.load > 0.3) {
        const loadRadius = radius + 4;
        this.ctx.strokeStyle = `rgba(255, ${Math.floor(255 * (1 - node.load))}, 0, 0.8)`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, loadRadius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * node.load));
        this.ctx.stroke();
      }
      
      // Иконка типа узла
      if (typeConfig && typeConfig.icon) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(typeConfig.icon, node.x, node.y);
      }
    }
  }

  /**
   * Отрисовка пакетов данных
   */
  renderPackets() {
    for (const packet of this.network.packets) {
      // Размер зависит от прогресса
      const size = packet.size + Math.sin(Date.now() / 100) * 1;
      
      // Цвет
      this.ctx.fillStyle = this.colors.packet;
      
      // Свечение
      const gradient = this.ctx.createRadialGradient(
        packet.x, packet.y, 0,
        packet.x, packet.y, size * 2
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(packet.x, packet.y, size * 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Ядро пакета
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(packet.x, packet.y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Отрисовка выделения
   */
  renderSelection() {
    for (const node of this.network.nodes) {
      if (node.selected) {
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.lineDashOffset = -Date.now() / 100;
        
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.getEffectiveRadius(), 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
      }
    }
  }

  /**
   * Отрисовка тепловой карты покрытия
   */
  renderCoverageHeatmap() {
    if (!this.network.targetPoints) return;
    
    for (const point of this.network.targetPoints) {
      this.ctx.fillStyle = point.covered 
        ? 'rgba(0, 255, 136, 0.3)' 
        : 'rgba(255, 0, 0, 0.2)';
      this.ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
    }
  }

  /**
   * Отрисовка тепловой карты нагрузки
   */
  renderLoadHeatmap() {
    for (const node of this.network.nodes) {
      if (node.load > 0.1) {
        const intensity = node.load;
        const radius = node.getEffectiveRadius();
        
        const gradient = this.ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, radius
        );
        
        const r = Math.floor(255 * intensity);
        const g = Math.floor(255 * (1 - intensity));
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, 0, 0.5)`);
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  /**
   * Отрисовка режима задержек
   */
  renderLatencyView() {
    for (const edge of this.network.edges) {
      if (!edge.active) continue;
      
      // Цвет от зеленого (низкая задержка) до красного (высокая)
      const latencyRatio = Math.min(1, edge.latency / 100);
      const r = Math.floor(255 * latencyRatio);
      const g = Math.floor(255 * (1 - latencyRatio));
      
      this.ctx.strokeStyle = `rgba(${r}, ${g}, 0, 0.5)`;
      this.ctx.lineWidth = 2;
      
      this.ctx.beginPath();
      this.ctx.moveTo(edge.nodeA.x, edge.nodeA.y);
      this.ctx.lineTo(edge.nodeB.x, edge.nodeB.y);
      this.ctx.stroke();
    }
  }

  /**
   * Установка режима просмотра
   * @param {string} mode
   */
  setViewMode(mode) {
    this.viewMode = mode;
  }

  /**
   * Получение узла под курсором
   * @param {number} mouseX
   * @param {number} mouseY
   * @returns {Node|null}
   */
  getNodeAt(mouseX, mouseY) {
    for (const node of this.network.nodes) {
      const dx = node.x - mouseX;
      const dy = node.y - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= 15) {  // Увеличенная зона клика
        return node;
      }
    }
    return null;
  }
}
