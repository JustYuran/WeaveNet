/**
 * Игровой движок
 */
import { NetworkSimulator } from './NetworkSimulator.js';
import { EventSystem } from './EventSystem.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.state = {
      currentMission: null,
      network: null,
      resources: { energy: 1000, info: 0 },
      gameTime: 0,
      isPaused: false,
      timeScale: 1,
      selectedNode: null,
      hoverNode: null,
      camera: { x: 0, y: 0, zoom: 1 },
      viewMode: 'default'
    };
    
    this.config = null;
    this.eventSystem = null;
    this.lastUpdate = 0;
    this.accumulator = 0;
    
    // Callbacks для UI
    this.onResourceUpdate = null;
    this.onMetricsUpdate = null;
    this.onMissionComplete = null;
    this.onMissionFail = null;
  }

  /**
   * Инициализация игры с конфигурацией миссии
   */
  async init(missionConfig, config) {
    this.config = config;
    this.state.currentMission = missionConfig;
    
    // Создание симулятора сети
    this.state.network = new NetworkSimulator(config);
    this.state.network.init(missionConfig);
    
    // Инициализация ресурсов
    this.state.resources = { 
      ...missionConfig.resources 
    };
    
    // Система событий
    this.eventSystem = new EventSystem(this);
    
    // Планирование событий из миссии
    if (missionConfig.events) {
      for (const eventConfig of missionConfig.events) {
        this.eventSystem.scheduleEvent(eventConfig);
      }
    }
    
    this.state.gameTime = 0;
    this.state.isPaused = false;
    this.state.timeScale = 1;
    
    // Начальный расчет дохода
    this.state.network.calculateIncome();
    
    console.log('Игра инициализирована:', missionConfig.name);
  }

  /**
   * Основной игровой цикл
   */
  loop(timestamp) {
    if (!this.lastUpdate) {
      this.lastUpdate = timestamp;
    }
    
    const deltaTime = (timestamp - this.lastUpdate) / 1000;
    this.lastUpdate = timestamp;
    
    if (!this.state.isPaused) {
      const scaledDelta = deltaTime * this.state.timeScale;
      this.update(scaledDelta);
    }
    
    this.render();
    
    requestAnimationFrame((t) => this.loop(t));
  }

  /**
   * Обновление состояния игры
   */
  update(deltaTime) {
    // Обновление времени
    this.state.gameTime += deltaTime;
    
    // Обновление сети
    if (this.state.network) {
      this.state.network.update(deltaTime);
      
      // Получение дохода от узлов (influence и data)
      const income = this.state.network.getIncome();
      
      // Начисление ресурсов
      this.state.resources.influence = (this.state.resources.influence || 0) + (income.influence || 0) * deltaTime;
      this.state.resources.data = (this.state.resources.data || 0) + (income.data || 0) * deltaTime;
      
      // Уведомление UI об обновлении ресурсов (каждые 0.1 сек)
      if (this.onResourceUpdate) {
        this.onResourceUpdate({
          resources: { ...this.state.resources },
          income: { influence: income.influence || 0, data: income.data || 0 }
        });
      }
      
      // Уведомление UI об обновлении метрик
      if (this.onMetricsUpdate) {
        this.onMetricsUpdate(this.state.network.getMetrics());
      }
    }
    
    // Обновление системы событий
    if (this.eventSystem) {
      this.eventSystem.update(deltaTime);
    }
    
    // Проверка условий победы/поражения
    this.checkMissionStatus();
  }

  /**
   * Отрисовка игры
   */
  render() {
    // Очистка canvas
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (!this.state.network) return;
    
    // Сохранение контекста для трансформаций камеры
    this.ctx.save();
    
    // Применение камеры
    this.ctx.translate(
      this.state.camera.x,
      this.state.camera.y
    );
    this.ctx.scale(
      this.state.camera.zoom,
      this.state.camera.zoom
    );
    
    // Отрисовка карты мира (фон)
    this.renderWorldMap();
    
    // Отрисовка зон помех
    this.renderJammerZones();
    
    // Отрисовка препятствий
    this.renderObstacles();
    
    // Отрисовка соединений
    this.renderEdges();
    
    // Отрисовка узлов
    this.renderNodes();
    
    // Отрисовка пакетов
    this.renderPackets();
    
    // Отрисовка радиуса при наведении
    if (this.state.hoverNode) {
      this.renderNodeRadius(this.state.hoverNode);
    }
    
    // Восстановление контекста
    this.ctx.restore();
    
    // Отрисовка тепловых карт в зависимости от режима вида (теперь внутри transform)
    this.renderViewOverlay();
  }

  /**
   * Отрисовка overlay для режимов вида (покрытие, нагрузка)
   */
  renderViewOverlay() {
    const viewMode = this.state.viewMode || 'default';
    
    if (viewMode === 'coverage') {
      this.renderCoverageOverlay();
    } else if (viewMode === 'load') {
      this.renderLoadOverlay();
    }
  }

  /**
   * Отрисовка overlay покрытия
   */
  renderCoverageOverlay() {
    for (const node of this.state.network.nodes) {
      // Зеленая зона покрытия только для игровых узлов
      const isGameNode = node.type === 'repeater' || node.type === 'server' || node.type === 'stealth_repeater';
      if (!isGameNode) continue;
      
      const gradient = this.ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, node.radius
      );
      gradient.addColorStop(0, 'rgba(0, 255, 136, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Граница радиуса
      this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
      this.ctx.setLineDash([5, 5]);
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  /**
   * Отрисовка overlay нагрузки
   */
  renderLoadOverlay() {
    for (const node of this.state.network.nodes) {
      // Нагрузка только для игровых узлов
      const isGameNode = node.type === 'repeater' || node.type === 'server' || node.type === 'stealth_repeater';
      if (!isGameNode) continue;
      
      const loadRatio = node.load / 100;
      
      // Цвет от зеленого (0%) к красному (100%)
      const r = Math.floor(255 * loadRatio);
      const g = Math.floor(255 * (1 - loadRatio));
      const color = `rgba(${r}, ${g}, 0, 0.3)`;
      
      const gradient = this.ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, node.radius
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Отрисовка сетки (удалено, используется renderWorldMap)
   */
  renderGrid() {
    // Метод устарел, используется renderWorldMap
  }

  /**
   * Отрисовка зон помех
   */
  renderJammerZones() {
    for (const zone of this.state.network.jammerZones) {
      const gradient = this.ctx.createRadialGradient(
        zone.x, zone.y, 0,
        zone.x, zone.y, zone.radius
      );
      gradient.addColorStop(0, 'rgba(255, 0, 100, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 0, 100, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = 'rgba(255, 0, 100, 0.5)';
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  /**
   * Отрисовка препятствий
   */
  renderObstacles() {
    for (const obstacle of this.state.network.obstacles) {
      this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  /**
   * Отрисовка соединений
   */
  renderEdges() {
    for (const edge of this.state.network.edges) {
      // Определяем цвет соединения в зависимости от типов узлов
      const isUserOrRouterEdge = (edge.nodeA.type === 'user' || edge.nodeA.type === 'router') && 
                                  (edge.nodeB.type === 'user' || edge.nodeB.type === 'router');
      
      if (isUserOrRouterEdge) {
        // Соединения между пользователями/роутерами - тонкие серые линии
        this.ctx.strokeStyle = '#444466';
        this.ctx.globalAlpha = 0.5;
        this.ctx.lineWidth = 1;
      } else {
        // Соединения игровых узлов - зеленые линии (#00ff64, толщина 2px)
        this.ctx.strokeStyle = '#00ff64';
        this.ctx.globalAlpha = 1.0;
        this.ctx.lineWidth = 2;
      }
      
      this.ctx.beginPath();
      this.ctx.moveTo(edge.nodeA.x, edge.nodeA.y);
      this.ctx.lineTo(edge.nodeB.x, edge.nodeB.y);
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * Отрисовка карты мира (фон) - кэшируется для производительности
   */
  renderWorldMap() {
    const mapWidth = this.state.network.mapWidth || 1000;
    const mapHeight = this.state.network.mapHeight || 1000;
    
    // Используем кэшированный оффскрин канвас для карты
    if (!this.worldMapCache) {
      this.worldMapCache = document.createElement('canvas');
      this.worldMapCache.width = mapWidth;
      this.worldMapCache.height = mapHeight;
      const cacheCtx = this.worldMapCache.getContext('2d');
      
      // Процедурная отрисовка местности из тайлов
      const tileSize = 5; // 5 пикселей = 1 метр
      
      for (let x = 0; x < mapWidth; x += tileSize) {
        for (let y = 0; y < mapHeight; y += tileSize) {
          const terrain = this.state.network.getTerrainInfo(x, y);
          
          let color;
          switch (terrain.type) {
            case 'mountain':
              color = 'rgba(90, 74, 58, 0.8)';
              break;
            case 'water':
              color = 'rgba(26, 58, 90, 0.9)';
              break;
            default: // plain
              color = 'rgba(45, 74, 45, 0.6)';
          }
          
          cacheCtx.fillStyle = color;
          cacheCtx.fillRect(x, y, tileSize, tileSize);
        }
      }
      
      // Сетка координат на кэше
      cacheCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      cacheCtx.lineWidth = 1;
      
      const gridStep = 100;
      for (let x = 0; x <= mapWidth; x += gridStep) {
        cacheCtx.beginPath();
        cacheCtx.moveTo(x, 0);
        cacheCtx.lineTo(x, mapHeight);
        cacheCtx.stroke();
      }
      
      for (let y = 0; y <= mapHeight; y += gridStep) {
        cacheCtx.beginPath();
        cacheCtx.moveTo(0, y);
        cacheCtx.lineTo(mapWidth, y);
        cacheCtx.stroke();
      }
      
      // Границы карты
      cacheCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      cacheCtx.lineWidth = 2;
      cacheCtx.strokeRect(0, 0, mapWidth, mapHeight);
    }
    
    // Рисуем кэшированную карту
    this.ctx.drawImage(this.worldMapCache, 0, 0);
  }

  /**
   * Отрисовка узлов
   */
  renderNodes() {
    for (const node of this.state.network.nodes) {
      // Используем цвет из конфига узла
      const color = node.color || node.getStatusColor();
      const shape = node.shape || 'circle';
      const size = node.size || 10;
      const baseRadius = node.selected ? size * 1.3 : size;
      
      // Свечение только для активных игровых узлов (не для пользователей и роутеров)
      const isGameNode = node.type === 'repeater' || node.type === 'server' || node.type === 'stealth_repeater' || node.type === 'hub';
      if (isGameNode) {
        const gradient = this.ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, baseRadius * 2
        );
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, baseRadius * 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      // Отрисовка узла в зависимости от формы
      this.ctx.fillStyle = color;
      
      if (shape === 'circle') {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, baseRadius, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (shape === 'square') {
        this.ctx.fillRect(
          node.x - baseRadius, 
          node.y - baseRadius, 
          baseRadius * 2, 
          baseRadius * 2
        );
      } else if (shape === 'triangle') {
        const h = baseRadius * Math.sqrt(3) / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(node.x, node.y - h);
        this.ctx.lineTo(node.x + baseRadius, node.y + h);
        this.ctx.lineTo(node.x - baseRadius, node.y + h);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (shape === 'hexagon') {
        // Отрисовка шестиугольника для Хаба
        const sides = 6;
        this.ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 6;
          const x = node.x + baseRadius * Math.cos(angle);
          const y = node.y + baseRadius * Math.sin(angle);
          if (i === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        }
        this.ctx.closePath();
        this.ctx.fill();
      }
      
      // Обводка при выделении или наведении
      if (node.selected || node.hovered) {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        if (shape === 'circle') {
          this.ctx.beginPath();
          this.ctx.arc(node.x, node.y, baseRadius + 3, 0, Math.PI * 2);
          this.ctx.stroke();
        } else if (shape === 'square') {
          this.ctx.strokeRect(
            node.x - baseRadius - 3, 
            node.y - baseRadius - 3, 
            (baseRadius + 3) * 2, 
            (baseRadius + 3) * 2
          );
        } else if (shape === 'triangle') {
          const h = (baseRadius + 3) * Math.sqrt(3) / 2;
          this.ctx.beginPath();
          this.ctx.moveTo(node.x, node.y - h);
          this.ctx.lineTo(node.x + baseRadius + 3, node.y + h);
          this.ctx.lineTo(node.x - baseRadius - 3, node.y + h);
          this.ctx.closePath();
          this.ctx.stroke();
        } else if (shape === 'hexagon') {
          const sides = 6;
          this.ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 6;
            const x = node.x + (baseRadius + 3) * Math.cos(angle);
            const y = node.y + (baseRadius + 3) * Math.sin(angle);
            if (i === 0) {
              this.ctx.moveTo(x, y);
            } else {
              this.ctx.lineTo(x, y);
            }
          }
          this.ctx.closePath();
          this.ctx.stroke();
        }
      }
      
      // Индикатор типа узла (эмодзи из конфига) - только для игровых узлов
      if (isGameNode) {
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const emoji = node.getEmoji();
        this.ctx.fillText(emoji, node.x, node.y);
      }
    }
  }

  /**
   * Отрисовка радиуса узла
   */
  renderNodeRadius(node) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.setLineDash([5, 5]);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  /**
   * Отрисовка пакетов
   */
  renderPackets() {
    for (const packet of this.state.network.packets) {
      const pos = packet.getPosition(this.state.network);
      
      this.ctx.fillStyle = '#00ffff';
      this.ctx.shadowColor = '#00ffff';
      this.ctx.shadowBlur = 10;
      
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.shadowBlur = 0;
    }
  }

  /**
   * Проверка статуса миссии
   */
  checkMissionStatus() {
    if (!this.state.currentMission) return;
    
    const objectives = this.state.currentMission.objectives;
    const metrics = this.state.network.getMetrics();
    const nodeCount = this.state.network.nodes.length;
    
    let completed = true;
    let failed = false;
    
    // Проверка целей
    if (objectives.coverage && metrics.coverage < objectives.coverage) {
      completed = false;
    }
    
    if (objectives.maxLatency && metrics.avgLatency > objectives.maxLatency) {
      completed = false;
    }
    
    if (objectives.minStability && metrics.stability < objectives.minStability) {
      completed = false;
    }
    
    if (objectives.nodeCount && nodeCount < objectives.nodeCount) {
      completed = false;
    }
    
    // Проверка времени
    if (objectives.timeLimit && this.state.gameTime > objectives.timeLimit) {
      if (!completed) {
        failed = true;
      }
    }
    
    // Уведомление о завершении (только один раз при достижении)
    if (completed && !this.state.missionComplete) {
      this.state.missionComplete = true;
      this.setPaused(true);
      if (this.onMissionComplete) {
        this.onMissionComplete(metrics);
      }
    } else if (failed && !this.state.missionFailed) {
      this.state.missionFailed = true;
      this.setPaused(true);
      if (this.onMissionFail) {
        this.onMissionFail(metrics);
      }
    }
  }

  /**
   * Добавление узла
   */
  addNode(x, y, type) {
    // Корректировка координат с учетом камеры
    const worldX = (x - this.state.camera.x) / this.state.camera.zoom;
    const worldY = (y - this.state.camera.y) / this.state.camera.zoom;
    
    // Проверка можно ли строить в этой точке (только для игровых узлов)
    const nodeConfig = this.config.nodeTypes[type];
    if (!nodeConfig) {
      console.error('Неизвестный тип узла:', type);
      return null;
    }
    
    // Статические узлы (home, router) и хаб нельзя размещать игроком
    if (nodeConfig.isStatic || nodeConfig.isHub) {
      console.log('Этот узел нельзя разместить вручную');
      return null;
    }
    
    if (!this.state.network.canBuildAt(worldX, worldY)) {
      console.log('Нельзя строить на воде!');
      return null;
    }
    
    // Проверка стоимости (influence)
    const influenceCost = nodeConfig.energyCost || 0;
    
    if ((this.state.resources.influence || 0) < influenceCost) {
      console.log('Недостаточно энергии! Требуется:', influenceCost, 'Доступно:', this.state.resources.influence);
      return null;
    }
    
    const terrainType = this.state.network.getTerrainType(worldX, worldY);
    const node = this.state.network.addNode(worldX, worldY, type, terrainType);
    
    // Списание стоимости
    this.state.resources.influence = (this.state.resources.influence || 0) - influenceCost;
    
    // Пересчет дохода после добавления узла
    this.state.network.calculateIncome();
    
    return node;
  }

  /**
   * Удаление узла
   */
  removeNode(nodeId) {
    const node = this.state.network.getNodeById(nodeId);
    if (!node) return false;
    
    // Нельзя удалять статические узлы (home, router) и хаб
    const nodeConfig = this.config.nodeTypes[node.type];
    if (!nodeConfig || nodeConfig.isStatic || nodeConfig.isHub) {
      console.log('Нельзя удалить этот тип узла');
      return false;
    }
    
    // Возврат части энергии (50%)
    if (nodeConfig && nodeConfig.energyCost) {
      this.state.resources.influence = (this.state.resources.influence || 0) + Math.floor(nodeConfig.energyCost * 0.5);
    }
    
    return this.state.network.removeNode(nodeId);
  }

  /**
   * Установка паузы
   */
  setPaused(paused) {
    this.state.isPaused = paused;
  }

  /**
   * Установка скорости времени
   */
  setTimeScale(scale) {
    this.state.timeScale = scale;
  }

  /**
   * Сохранение игры
   */
  save() {
    const saveData = {
      mission: this.state.currentMission?.id,
      resources: { ...this.state.resources },
      gameTime: this.state.gameTime,
      network: this.state.network.toJSON(),
      events: this.eventSystem?.toJSON()
    };
    
    localStorage.setItem('weavenet_save', JSON.stringify(saveData));
    console.log('Игра сохранена');
    return saveData;
  }

  /**
   * Загрузка игры
   */
  async load() {
    const saveData = localStorage.getItem('weavenet_save');
    if (!saveData) return false;
    
    try {
      const data = JSON.parse(saveData);
      
      // Загрузка конфигурации миссии
      const response = await fetch('data/scenarios.json');
      const scenarios = await response.json();
      const missionConfig = scenarios[data.mission];
      
      if (!missionConfig) return false;
      
      await this.init(missionConfig, this.config);
      
      // Восстановление состояния
      this.state.resources = data.resources;
      this.state.gameTime = data.gameTime;
      this.state.network = NetworkSimulator.fromJSON(data.network, this.config);
      
      if (data.events && this.eventSystem) {
        this.eventSystem = EventSystem.fromJSON(data.events, this);
      }
      
      console.log('Игра загружена');
      return true;
    } catch (e) {
      console.error('Ошибка загрузки:', e);
      return false;
    }
  }

  /**
   * Сброс игры
   */
  reset() {
    localStorage.removeItem('weavenet_save');
    location.reload();
  }

  /**
   * Установка режима отображения
   */
  setViewMode(mode) {
    this.state.viewMode = mode;
  }
}
