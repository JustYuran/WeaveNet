/**
 * Игровой движок WeaveNet
 * Управляет игровым циклом, состоянием и координацией всех систем
 */
import { NetworkSimulator } from './NetworkSimulator.js';
import { EventSystem } from './EventSystem.js';
import { CanvasRenderer } from '../renderer/CanvasRenderer.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Состояние игры
    this.state = {
      currentMission: null,
      network: null,
      resources: { influence: 0, data: 0 },
      gameTime: 0,           // Время игры в мс
      isPaused: false,
      timeScale: 1,          // Множитель скорости (1, 2, 5)
      missionComplete: false
    };
    
    // Системы
    this.renderer = null;
    this.eventSystem = null;
    this.ui = null;
    
    // Конфигурация
    this.config = null;
    
    // Временные переменные
    this.lastUpdate = 0;
    this.accumulatedTime = 0;
    this.simulationTickRate = 1000;  // 1 секунда между тиками симуляции
    this.simulationAccumulator = 0;
    
    // Генерация пакетов
    this.packetSpawnTimer = 0;
    this.packetSpawnInterval = 500;  // Пакет каждые 500мс
    
    // Выбранный тип узла для размещения
    this.selectedNodeType = 'basic';
  }

  /**
   * Инициализация игры с конфигурацией миссии
   * @param {object} missionConfig - Конфигурация миссии
   * @param {object} gameConfig - Общая конфигурация игры
   */
  async init(missionConfig, gameConfig) {
    this.state.currentMission = missionConfig;
    this.config = gameConfig;
    
    // Инициализация ресурсов
    this.state.resources = {...missionConfig.resources};
    this.state.gameTime = 0;
    this.state.isPaused = false;
    this.state.timeScale = 1;
    this.state.missionComplete = false;
    
    // Создание сети
    this.state.network = new NetworkSimulator(this.config);
    
    // Настройка карты
    if (missionConfig.map) {
      this.state.network.obstacles = missionConfig.map.obstacles || [];
      this.state.network.jammerZones = [];
    }
    
    // Добавление начальных узлов
    if (missionConfig.initialNodes) {
      for (const nodeData of missionConfig.initialNodes) {
        const typeConfig = this.config.nodeTypes[nodeData.type];
        this.state.network.addNode(
          nodeData.x, 
          nodeData.y, 
          nodeData.type, 
          typeConfig
        );
      }
    }
    
    // Инициализация рендерера
    this.renderer = new CanvasRenderer(this.canvas, this.state.network);
    
    // Инициализация системы событий
    this.eventSystem = new EventSystem(this);
    
    // Планирование событий из миссии
    if (missionConfig.events) {
      for (const event of missionConfig.events) {
        this.eventSystem.scheduleEvent(event);
      }
    }
    
    // Обновление UI
    if (this.ui) {
      this.ui.updateResources();
      this.ui.updateObjectives();
    }
    
    console.log('Игра инициализирована:', missionConfig.name);
  }

  /**
   * Основной игровой цикл
   */
  loop() {
    const currentTime = performance.now();
    let deltaTime = currentTime - this.lastUpdate;
    
    // Ограничение deltaTime для предотвращения скачков
    if (deltaTime > 100) deltaTime = 100;
    
    this.lastUpdate = currentTime;
    
    if (!this.state.isPaused) {
      // Применяем множитель времени
      const scaledDeltaTime = deltaTime * this.state.timeScale;
      
      // Обновление состояния
      this.update(scaledDeltaTime, currentTime);
      
      // Обновление времени игры
      this.state.gameTime += scaledDeltaTime;
      
      // Симуляция сети (с фиксированным шагом)
      this.simulationAccumulator += scaledDeltaTime;
      while (this.simulationAccumulator >= this.simulationTickRate) {
        this.state.network.simulateTick(this.simulationTickRate);
        this.simulationAccumulator -= this.simulationTickRate;
        
        // Генерация случайных пакетов
        this.spawnPackets(this.simulationTickRate);
      }
      
      // Обновление событий
      this.eventSystem.update(scaledDeltaTime, this.state.gameTime);
    }
    
    // Отрисовка (всегда, даже на паузе)
    this.render();
    
    // Обновление UI
    if (this.ui) {
      this.ui.updateStats();
      this.ui.updateTimer(this.state.gameTime);
    }
    
    // Проверка условий победы
    this.checkVictoryConditions();
    
    // Следующий кадр
    requestAnimationFrame(() => this.loop());
  }

  /**
   * Обновление игровой логики
   * @param {number} deltaTime
   * @param {number} currentTime
   */
  update(deltaTime, currentTime) {
    // Пассивный доход ресурсов
    this.updateResources(deltaTime);
  }

  /**
   * Обновление ресурсов (пассивный доход)
   * @param {number} deltaTime
   */
  updateResources(deltaTime) {
    const seconds = deltaTime / 1000;
    const metrics = this.state.network.getMetrics();
    
    // Базовый доход
    this.state.resources.influence += this.config.economy.baseIncome.influence * seconds;
    this.state.resources.data += this.config.economy.baseIncome.data * seconds;
    
    // Доход от каждого узла согласно его типу
    for (const node of this.state.network.nodes) {
      const nodeConfig = this.config.nodeTypes[node.type];
      if (nodeConfig && nodeConfig.income) {
        this.state.resources.influence += nodeConfig.income.influence * seconds;
        this.state.resources.data += nodeConfig.income.data * seconds;
      }
    }
    
    // Доход от покрытия
    this.state.resources.influence += metrics.coverage * this.config.economy.incomePerCoverage.influence * seconds;
    this.state.resources.data += metrics.coverage * this.config.economy.incomePerCoverage.data * seconds;
  }

  /**
   * Генерация пакетов данных
   * @param {number} deltaTime
   */
  spawnPackets(deltaTime) {
    this.packetSpawnTimer += deltaTime;
    
    if (this.packetSpawnTimer >= this.packetSpawnInterval) {
      this.packetSpawnTimer = 0;
      
      const nodes = this.state.network.nodes.filter(n => n.status === 'active');
      
      if (nodes.length >= 2) {
        // Выбираем случайные узлы отправителя и получателя
        const fromNode = nodes[Math.floor(Math.random() * nodes.length)];
        let toNode = nodes[Math.floor(Math.random() * nodes.length)];
        
        // Убедимся что это разные узлы
        let attempts = 0;
        while (toNode === fromNode && attempts < 10) {
          toNode = nodes[Math.floor(Math.random() * nodes.length)];
          attempts++;
        }
        
        if (toNode !== fromNode) {
          this.state.network.routePacket(fromNode.id, toNode.id);
        }
      }
    }
  }

  /**
   * Отрисовка
   */
  render() {
    if (this.renderer) {
      this.renderer.render();
    }
  }

  /**
   * Проверка условий победы
   */
  checkVictoryConditions() {
    if (this.state.missionComplete || !this.state.currentMission) return;
    
    const objectives = this.state.currentMission.objectives;
    const metrics = this.state.network.getMetrics();
    
    let allComplete = true;
    
    // Проверка покрытия
    if (objectives.coverage && metrics.coverage < objectives.coverage) {
      allComplete = false;
    }
    
    // Проверка задержки (должна быть меньше максимума)
    if (objectives.maxLatency && metrics.avgLatency > objectives.maxLatency) {
      allComplete = false;
    }
    
    // Проверка стабильности
    if (objectives.minStability && metrics.stability < objectives.minStability) {
      allComplete = false;
    }
    
    // Проверка времени (если есть лимит)
    if (objectives.timeLimit) {
      const timeSeconds = this.state.gameTime / 1000;
      if (timeSeconds >= objectives.timeLimit) {
        // Время вышло
        if (allComplete) {
          this.completeMission(true);
        } else {
          this.completeMission(false);
        }
        return;
      }
    }
    
    if (allComplete) {
      this.completeMission(true);
    }
  }

  /**
   * Завершение миссии
   * @param {boolean} success
   */
  completeMission(success) {
    this.state.missionComplete = true;
    this.state.isPaused = true;
    
    if (this.ui) {
      this.ui.showMissionComplete(success);
    }
  }

  /**
   * Пауза/продолжение
   */
  togglePause() {
    this.state.isPaused = !this.state.isPaused;
    this.lastUpdate = performance.now();
  }

  /**
   * Установка скорости времени
   * @param {number} speed - 1, 2, или 5
   */
  setTimeSpeed(speed) {
    this.state.timeScale = speed;
  }

  /**
   * Добавление узла
   * @param {number} x
   * @param {number} y
   * @param {string} type
   */
  addNode(x, y, type) {
    const typeConfig = this.config.nodeTypes[type];
    const cost = typeConfig.cost;
    
    // Проверка ресурсов
    if (this.state.resources.influence < cost.influence ||
        this.state.resources.data < cost.data) {
      return false;
    }
    
    // Списываем ресурсы
    this.state.resources.influence -= cost.influence;
    this.state.resources.data -= cost.data;
    
    // Добавляем узел
    this.state.network.addNode(x, y, type, typeConfig);
    
    // Обновляем UI
    if (this.ui) {
      this.ui.updateResources();
    }
    
    return true;
  }

  /**
   * Удаление узла
   * @param {number} nodeId
   */
  removeNode(nodeId) {
    this.state.network.removeNode(nodeId);
  }

  /**
   * Сохранение игры
   * @returns {string} JSON строка
   */
  save() {
    const saveData = {
      mission: this.state.currentMission?.id,
      resources: {...this.state.resources},
      gameTime: this.state.gameTime,
      network: this.state.network.serialize(),
      config: this.config
    };
    
    localStorage.setItem('weavenet_save', JSON.stringify(saveData));
    return JSON.stringify(saveData);
  }

  /**
   * Загрузка игры
   * @param {string} jsonString
   */
  load(jsonString) {
    try {
      const saveData = JSON.parse(jsonString);
      
      this.state.resources = saveData.resources;
      this.state.gameTime = saveData.gameTime;
      this.state.network = NetworkSimulator.deserialize(
        saveData.network, 
        saveData.config
      );
      
      // Пересоздаем рендерер с новой сетью
      this.renderer = new CanvasRenderer(this.canvas, this.state.network);
      
      if (this.ui) {
        this.ui.updateResources();
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
    
    if (this.state.currentMission && this.config) {
      this.init(this.state.currentMission, this.config);
    }
  }

  /**
   * Установка UI контроллера
   * @param {object} ui
   */
  setUI(ui) {
    this.ui = ui;
  }
}
