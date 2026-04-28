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
    
    // Генерация случайной карты 1920x1080
    this.mapWidth = 1920;
    this.mapHeight = 1080;
    
    // Создание Хаба (базовое строение в центре карты)
    const hubX = this.mapWidth / 2;
    const hubY = this.mapHeight / 2;
    this.addNode(hubX, hubY, 'hub');
    
    // Генерация 50 роутеров случайным образом на карте
    const routerPositions = [];
    for (let i = 0; i < 50; i++) {
      let x, y, valid;
      let attempts = 0;
      do {
        x = Math.random() * this.mapWidth;
        y = Math.random() * this.mapHeight;
        // Проверка: не ближе 25 метров от хаба
        const distToHub = Math.hypot(x - hubX, y - hubY);
        valid = distToHub >= 25;
        attempts++;
      } while (!valid && attempts < 100);
      
      if (valid) {
        this.addNode(x, y, 'router');
        routerPositions.push({ x, y });
      }
    }
    
    // Для каждого роутера генерируем от 1 до 5 пользователей в радиусе его покрытия
    const userPositions = [];
    for (const router of routerPositions) {
      const userCount = Math.floor(Math.random() * 5) + 1; // 1-5 пользователей
      for (let i = 0; i < userCount; i++) {
        let x, y, valid;
        let attempts = 0;
        do {
          // Случайная позиция в радиусе 80px от роутера (радиус роутера)
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 80;
          x = router.x + Math.cos(angle) * distance;
          y = router.y + Math.sin(angle) * distance;
          // Проверка границ карты
          valid = x >= 0 && x <= this.mapWidth && y >= 0 && y <= this.mapHeight;
          attempts++;
        } while (!valid && attempts < 100);
        
        if (valid) {
          this.addNode(x, y, 'home');
          userPositions.push({ x, y });
        }
      }
    }
    
    // Дополнительно 500 пользователей случайным образом по карте (не ближе 25м от хаба)
    for (let i = 0; i < 500; i++) {
      let x, y, valid;
      let attempts = 0;
      do {
        x = Math.random() * this.mapWidth;
        y = Math.random() * this.mapHeight;
        // Проверка: не ближе 25 метров от хаба
        const distToHub = Math.hypot(x - hubX, y - hubY);
        valid = distToHub >= 25;
        attempts++;
      } while (!valid && attempts < 100);
      
      if (valid) {
        this.addNode(x, y, 'home');
      }
    }
    
    // Автоматическое соединение пользователей и роутеров на расстоянии ≤ 5 пикселей
    this.autoConnectNearbyNodes(5);

    // Создание начальных узлов (игровые узлы игрока)
    if (missionConfig.initialNodes) {
      for (const nodeData of missionConfig.initialNodes) {
        this.addNode(nodeData.x, nodeData.y, nodeData.type);
      }
    }
    
    // Создание домашних узлов из конфига
    if (this.homeNodes) {
      for (const nodeData of this.homeNodes) {
        this.addNode(nodeData.x, nodeData.y, nodeData.type);
      }
    }

    // Первичный расчет соединений
    this.updateConnections();
  }

  /**
   * Автоматическое соединение близких узлов
   */
  autoConnectNearbyNodes(maxDistance) {
    const users = this.nodes.filter(n => n.type === 'user');
    const routers = this.nodes.filter(n => n.type === 'router');
    
    for (const user of users) {
      for (const router of routers) {
        const distance = Math.hypot(user.x - router.x, user.y - router.y);
        if (distance <= maxDistance) {
          // Соединение будет создано в updateConnections()
          // Здесь просто помечаем что они близки
        }
      }
    }
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
    
    // Нельзя удалять статические узлы (home, router) и хаб
    if (node.isStatic || node.isHub) {
      console.log('Нельзя удалить статический узел или хаб');
      return false;
    }
    
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
        
        // Для пользователей и роутеров: соединение если расстояние ≤ 5 пикселей
        // Для игровых узлов: соединение по радиусу покрытия
        let shouldConnect = false;
        
        const isUserOrRouter = (node.type === 'user' || node.type === 'router') && 
                               (neighbor.type === 'user' || neighbor.type === 'router');
        
        if (isUserOrRouter) {
          // Автоматическое соединение на расстоянии ≤ 5 пикселей
          shouldConnect = distance <= 5;
        } else {
          // Игровые узлы соединяются по радиусу покрытия (минимальный из двух радиусов)
          const maxConnectDist = Math.min(effectiveRadius, neighborEffectiveRadius);
          shouldConnect = distance <= maxConnectDist;
        }
        
        if (shouldConnect) {
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
   * Расчет дохода от узлов (устаревший метод, оставлен для совместимости)
   */
  calculateIncome() {
    let totalEnergy = 0;
    let totalInfo = 0;
    
    for (const node of this.nodes) {
      // Одинокий узел тоже приносит доход
      const isAlone = this.nodes.length === 1;
      // Узел дает доход если подключен к сети (имеет соединения) или он один
      if (isAlone || node.connections.length > 0) {
        totalEnergy += node.energyCost || 0;
        totalInfo += node.throughput || 0;
      }
    }
    
    this.incomePerSecond = {
      energy: totalEnergy,
      info: totalInfo
    };
    
    return this.incomePerSecond;
  }

  /**
   * Расчет получения информации от подключенных к Хабу пользователей
   * Информация генерируется пользователями (home) и передается через узлы игрока к Хабу
   */
  calculateInfoGain() {
    let totalInfoGain = 0;
    
    // Находим Хаб
    const hub = this.nodes.find(n => n.type === 'hub');
    if (!hub) return 0;
    
    // Находим все узлы, которые принадлежат игроку (не static и не hub)
    const playerNodes = this.nodes.filter(n => 
      !n.isStatic && n.type !== 'hub' && n.type !== 'home' && n.type !== 'router'
    );
    
    // Находим всех пользователей (home), которые генерируют информацию
    const homeNodes = this.nodes.filter(n => n.type === 'home');
    
    // Для каждого home проверяем, подключен ли он к Хабу через цепочку узлов
    for (const home of homeNodes) {
      if (this.isConnectedToHub(home, hub, playerNodes)) {
        // Дом генерирует информацию согласно throughput из конфига
        const homeConfig = this.config.nodeTypes?.home;
        const throughput = homeConfig?.throughput || 10;
        totalInfoGain += throughput;
      }
    }
    
    return totalInfoGain;
  }
  
  /**
   * Проверка, подключен ли узел к Хабу через цепочку узлов игрока
   * Использует BFS для поиска пути
   */
  isConnectedToHub(startNode, hub, playerNodes) {
    if (startNode.id === hub.id) return true;
    
    const visited = new Set();
    const queue = [startNode];
    visited.add(startNode.id);
    
    // Создаем мапу узлов для быстрого доступа
    const nodeMap = new Map();
    for (const node of this.nodes) {
      nodeMap.set(node.id, node);
    }
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      // Проверяем соседей
      for (const neighborId of current.connections) {
        const neighbor = nodeMap.get(neighborId);
        if (!neighbor || visited.has(neighbor.id)) continue;
        
        // Если это Хаб - путь найден
        if (neighbor.id === hub.id) {
          return true;
        }
        
        // Проверяем, является ли сосед узлом игрока или роутером/домом (передатчики)
        const isPlayerNode = !neighbor.isStatic && neighbor.type !== 'hub';
        const isRouterOrHome = neighbor.type === 'router' || neighbor.type === 'home';
        
        if (isPlayerNode || isRouterOrHome) {
          visited.add(neighbor.id);
          queue.push(neighbor);
        }
      }
    }
    
    return false;
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
    // Считаем только узлы игрока (не static и не hub)
    const playerNodes = this.nodes.filter(n => 
      !n.isStatic && n.type !== 'hub'
    );
    const totalPlayerNodes = playerNodes.length;
    
    if (totalPlayerNodes === 0) {
      this.metrics = {
        coverage: 0,
        avgLatency: 0,
        stability: 100,
        totalPackets: this.metrics.totalPackets,
        deliveredPackets: this.metrics.deliveredPackets
      };
      return;
    }
    
    // Подсчет подключенных узлов игрока (имеющих хотя бы одно соединение)
    let connectedPlayerNodes = 0;
    for (const node of playerNodes) {
      if (node.connections.length > 0) {
        connectedPlayerNodes++;
      }
    }
    
    // Стабильность = процент подключенных узлов игрока
    this.metrics.stability = totalPlayerNodes > 0 
      ? (connectedPlayerNodes / totalPlayerNodes) * 100 
      : 100;
    
    // Покрытие (симуляция по площади)
    this.metrics.coverage = this.calculateCoverage();
    
    // Средняя задержка (на основе количества хопов)
    this.metrics.avgLatency = this.calculateAverageLatency();
  }

  /**
   * Расчет покрытия территории
   * Покрытие = доля точек (home), фактически подключённых к активной сети игрока (через цепочку к Хабу)
   */
  calculateCoverage() {
    if (this.nodes.length === 0) return 0;
    
    // Находим Хаб
    const hub = this.nodes.find(n => n.type === 'hub');
    if (!hub) return 0;
    
    // Находим все узлы игрока (не static и не hub)
    const playerNodes = this.nodes.filter(n => 
      !n.isStatic && n.type !== 'hub' && n.type !== 'home' && n.type !== 'router'
    );
    
    // Находим всех пользователей (home)
    const homeNodes = this.nodes.filter(n => n.type === 'home');
    
    if (homeNodes.length === 0) return 0;
    
    // Считаем сколько home подключено к Хабу
    let connectedHomes = 0;
    for (const home of homeNodes) {
      if (this.isConnectedToHub(home, hub, playerNodes)) {
        connectedHomes++;
      }
    }
    
    return (connectedHomes / homeNodes.length) * 100;
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
    if (terrain === 'water') return false;
    
    // Проверка: нельзя строить ближе 25 метров от хаба
    const hub = this.nodes.find(n => n.type === 'hub');
    if (hub) {
      const distToHub = Math.hypot(x - hub.x, y - hub.y);
      if (distToHub < 25) return false;
    }
    
    return true;
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
