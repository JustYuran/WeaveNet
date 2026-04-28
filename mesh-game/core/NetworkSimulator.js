/**
 * Симулятор mesh-сети
 */
import { Node } from '../entities/Node.js';
import { Edge } from '../entities/Edge.js';
import { Packet } from '../entities/Packet.js';
import { SpatialHash } from '../utils/SpatialHash.js';
import { Pathfinding } from '../algorithms/Pathfinding.js';

export class NetworkSimulator {
  constructor(config) {
    this.nodes = [];
    this.edges = [];
    this.packets = [];
    this.config = config;
    this.spatialHash = new SpatialHash(100);
    this.pathfinding = new Pathfinding(this);
    
    this.nextNodeId = 1;
    this.nextEdgeId = 1;
    this.nextPacketId = 1;
    
    this.jammerZones = [];
    this.obstacles = [];
    
    // Метрики
    this.metrics = {
      coverage: 0,
      avgLatency: 0,
      stability: 100,
      totalPackets: 0,
      deliveredPackets: 0
    };
    
    // Таймер ресурсов
    this.resourceAccumulator = 0;
    this.incomePerSecond = { influence: 0, data: 0 };
  }

  /**
   * Инициализация сети из конфигурации миссии
   */
  init(missionConfig) {
    this.nodes = [];
    this.edges = [];
    this.packets = [];
    this.nextNodeId = 1;
    this.nextEdgeId = 1;
    
    this.obstacles = missionConfig.map?.obstacles || [];
    this.jammerZones = missionConfig.map?.jammerZones || [];
    this.homeNodes = missionConfig.map?.homeNodes || [];
    
    // Создание начальных узлов
    if (missionConfig.initialNodes) {
      for (const nodeData of missionConfig.initialNodes) {
        this.addNode(nodeData.x, nodeData.y, nodeData.type);
      }
    }
    
    // Создание домашних узлов (пользовательские ретрансляторы)
    if (this.homeNodes) {
      for (const nodeData of this.homeNodes) {
        this.addNode(nodeData.x, nodeData.y, nodeData.type);
      }
    }

    // Первичный расчет соединений
    this.updateConnections();
  }

  /**
   * Добавление узла
   */
  addNode(x, y, type = 'basic', terrainType = 'plain') {
    const node = new Node(
      `node_${this.nextNodeId++}`,
      x,
      y,
      type,
      this.config,
      terrainType
    );
    
    this.nodes.push(node);
    this.updateConnections();
    
    return node;
  }

  /**
   * Удаление узла
   */
  removeNode(nodeId) {
    const index = this.nodes.findIndex(n => n.id === nodeId);
    if (index === -1) return false;
    
    const node = this.nodes[index];
    
    // Удаление связанных ребер
    this.edges = this.edges.filter(edge => 
      edge.nodeA.id !== nodeId && edge.nodeB.id !== nodeId
    );
    
    // Обновление соединений у соседей
    for (const otherNode of this.nodes) {
      otherNode.connections = otherNode.connections.filter(id => id !== nodeId);
    }
    
    // Удаление узла
    this.nodes.splice(index, 1);
    this.updateConnections();
    
    return true;
  }

  /**
   * Получение узла по ID
   */
  getNodeById(id) {
    return this.nodes.find(n => n.id === id);
  }

  /**
   * Получение ребра между узлами
   */
  getEdgeBetween(nodeAId, nodeBId) {
    return this.edges.find(edge => 
      (edge.nodeA.id === nodeAId && edge.nodeB.id === nodeBId) ||
      (edge.nodeA.id === nodeBId && edge.nodeB.id === nodeAId)
    );
  }

  /**
   * Обновление соединений между узлами
   */
  updateConnections() {
    // Очистка старых ребер
    this.edges = [];
    this.nextEdgeId = 1;
    
    // Сброс статуса изоляции и очистка соединений у всех узлов
    for (const node of this.nodes) {
      node.connections = [];
      if (node.status !== 'offline') {
        node.status = 'isolated';
      }
    }
    
    // Поиск и создание новых соединений
    const connectedPairs = new Set();
    
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      
      // Пропускаем оффлайн узлы
      if (node.status === 'offline') continue;
      
      // Эффективный радиус с учетом помех
      const effectiveRadius = node.getEffectiveRadius(this.jammerZones);
      
      // Проверяем все остальные узлы напрямую (без spatial hash для надежности)
      for (let j = i + 1; j < this.nodes.length; j++) {
        const neighbor = this.nodes[j];
        
        if (neighbor.status === 'offline') continue;
        
        const neighborEffectiveRadius = neighbor.getEffectiveRadius(this.jammerZones);
        
        // Расстояние между узлами
        const distance = Math.hypot(node.x - neighbor.x, node.y - neighbor.y);
        
        // Условие соединения: расстояние <= минимального из радиусов * коэффициент
        // Используем более мягкое условие для лучшей играбельности
        const maxConnectDist = Math.min(effectiveRadius, neighborEffectiveRadius) * 1.2;
        
        if (distance <= maxConnectDist) {
          const pairKey = [node.id, neighbor.id].sort().join('-');
          
          if (!connectedPairs.has(pairKey)) {
            connectedPairs.add(pairKey);
            
            // Создание ребра
            const edge = new Edge(`edge_${this.nextEdgeId++}`, node, neighbor);
            this.edges.push(edge);
            
            // Добавление соединения у узлов
            node.connections.push(neighbor.id);
            neighbor.connections.push(node.id);
            
            // Обновляем статус на активный
            if (node.status === 'isolated') node.status = 'active';
            if (neighbor.status === 'isolated') neighbor.status = 'active';
          }
        }
      }
    }
  }

  /**
   * Отправка пакета данных
   */
  sendPacket(fromId, toId) {
    const path = this.pathfinding.findPath(fromId, toId);
    
    if (!path || path.length < 2) {
      return null;
    }
    
    const packet = new Packet(
      `packet_${this.nextPacketId++}`,
      fromId,
      toId,
      path
    );
    
    this.packets.push(packet);
    this.metrics.totalPackets++;
    
    return packet;
  }

  /**
   * Один шаг симуляции
   */
  update(deltaTime) {
    // Обновление узлов
    for (const node of this.nodes) {
      node.update(deltaTime, this, this.jammerZones);
    }
    
    // Обновление ребер
    for (const edge of this.edges) {
      edge.update(deltaTime);
    }
    
    // Обновление пакетов
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const packet = this.packets[i];
      packet.update(deltaTime, this);
      
      if (packet.completed) {
        this.packets.splice(i, 1);
        this.metrics.deliveredPackets++;
      }
    }
    
    // Накопление ресурсов (каждую секунду)
    this.resourceAccumulator += deltaTime;
    if (this.resourceAccumulator >= 1.0) {
      this.calculateIncome();
      this.resourceAccumulator -= 1.0;
    }
    
    // Пересчет метрик
    this.calculateMetrics();
  }

  /**
   * Расчет дохода от узлов
   */
  calculateIncome() {
    let totalInfluence = 0;
    let totalData = 0;
    
    for (const node of this.nodes) {
      // Одинокий узел тоже приносит доход
      const isAlone = this.nodes.length === 1;
      // Узел дает доход если подключен к сети (имеет соединения) или он один
      if (isAlone || node.connections.length > 0) {
        totalInfluence += node.income.influence;
        totalData += node.income.data;
      }
    }
    
    this.incomePerSecond = {
      influence: totalInfluence,
      data: totalData
    };
    
    return this.incomePerSecond;
  }

  /**
   * Получение текущего дохода
   */
  getIncome() {
    return this.incomePerSecond;
  }

  /**
   * Расчет метрик сети
   */
  calculateMetrics() {
    const totalNodes = this.nodes.length;
    
    if (totalNodes === 0) {
      this.metrics = {
        coverage: 0,
        avgLatency: 0,
        stability: 100,
        totalPackets: this.metrics.totalPackets,
        deliveredPackets: this.metrics.deliveredPackets
      };
      return;
    }
    
    // Подсчет подключенных узлов (имеющих хотя бы одно соединение)
    let connectedNodes = 0;
    for (const node of this.nodes) {
      if (node.connections.length > 0) {
        connectedNodes++;
      }
    }
    
    // Стабильность = процент подключенных узлов
    this.metrics.stability = totalNodes > 0 
      ? (connectedNodes / totalNodes) * 100 
      : 100;
    
    // Покрытие (симуляция по площади)
    this.metrics.coverage = this.calculateCoverage();
    
    // Средняя задержка (на основе количества хопов)
    this.metrics.avgLatency = this.calculateAverageLatency();
  }

  /**
   * Расчет покрытия территории
   */
  calculateCoverage() {
    if (this.nodes.length === 0) return 0;
    
    // Упрощенный расчет: отношение покрытой площади к общей
    // Для простоты используем эвристику на основе количества узлов и их радиусов
    
    let totalCoveredArea = 0;
    const samplePoints = [];
    
    // Генерация тестовых точек
    const gridSize = 50;
    const mapWidth = 1000;
    const mapHeight = 800;
    
    let coveredPoints = 0;
    let totalPoints = 0;
    
    for (let x = gridSize / 2; x < mapWidth; x += gridSize) {
      for (let y = gridSize / 2; y < mapHeight; y += gridSize) {
        totalPoints++;
        
        // Проверка покрытия точки любым узлом
        for (const node of this.nodes) {
          const effectiveRadius = node.radius;
          const dist = Math.hypot(node.x - x, node.y - y);
          
          if (dist <= effectiveRadius) {
            coveredPoints++;
            break;
          }
        }
      }
    }
    
    return totalPoints > 0 ? (coveredPoints / totalPoints) * 100 : 0;
  }

  /**
   * Расчет средней задержки
   */
  calculateAverageLatency() {
    if (this.nodes.length < 2) return 0;
    
    let totalLatency = 0;
    let pathCount = 0;
    
    // Выборка путей между случайными парами узлов
    const sampleSize = Math.min(10, this.nodes.length);
    
    for (let i = 0; i < sampleSize; i++) {
      for (let j = i + 1; j < sampleSize; j++) {
        const path = this.pathfinding.findPath(
          this.nodes[i].id,
          this.nodes[j].id
        );
        
        if (path && path.length > 1) {
          // Задержка = базовая + нагрузка на каждом узле
          let latency = 10; // Базовая задержка
          for (const nodeId of path) {
            const node = this.getNodeById(nodeId);
            if (node) {
              latency += (node.load / node.capacity) * 50;
            }
          }
          
          totalLatency += latency;
          pathCount++;
        }
      }
    }
    
    return pathCount > 0 ? totalLatency / pathCount : 0;
  }

  /**
   * Получение текущих метрик
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Серийнаялизация для сохранения
   */
  toJSON() {
    return {
      nodes: this.nodes.map(n => n.toJSON()),
      edges: this.edges.map(e => e.toJSON()),
      nextNodeId: this.nextNodeId,
      nextEdgeId: this.nextEdgeId,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Десериализация
   */
  static fromJSON(data, config) {
    const simulator = new NetworkSimulator(config);
    
    // Восстановление узлов
    simulator.nodes = data.nodes.map(n => Node.fromJSON(n, config));
    simulator.nextNodeId = data.nextNodeId;
    simulator.nextEdgeId = data.nextEdgeId;
    
    // Пересчет соединений
    simulator.updateConnections();
    
    return simulator;
  }

  /**
   * Определение типа местности по координатам
   */
  getTerrainType(x, y) {
    // Простая процедурная генерация местности
    // Используем синусоиды для создания "континентов"
    const scale = 0.01;
    const mountainThreshold = 0.6;
    const waterThreshold = -0.3;
    
    const noise = Math.sin(x * scale) * Math.cos(y * scale) + 
                  Math.sin(x * scale * 2.5 + 1) * 0.5 +
                  Math.cos(y * scale * 1.8 + 2) * 0.3;
    
    if (noise > mountainThreshold) return 'mountain';
    if (noise < waterThreshold) return 'water';
    return 'plain';
  }

  /**
   * Проверка можно ли строить в данной точке
   */
  canBuildAt(x, y) {
    const terrain = this.getTerrainType(x, y);
    return terrain !== 'water';
  }

  /**
   * Получение информации о местности в точке
   */
  getTerrainInfo(x, y) {
    const type = this.getTerrainType(x, y);
    // Защита от отсутствующей конфигурации местности
    const terrainConfig = (this.config && this.config.terrain) ? this.config.terrain : {};
    const terrainData = terrainConfig[type] || {};
    
    return {
      type,
      name: terrainData.name || 'Равнина',
      buildable: terrainData.buildable ?? true,
      radiusModifier: terrainData.radiusModifier || 1.0,
      costModifier: terrainData.costModifier || 1.0
    };
  }
}
