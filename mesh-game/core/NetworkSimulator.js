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
    
    // Генерация случайной карты 200x200 участков (1 участок = 5 пикселей)
    this.mapWidth = 1000;  // 200 участков * 5 пикселей
    this.mapHeight = 1000; // 200 участков * 5 пикселей
    this.tileSize = 5;     // 5 пикселей = 1 метр/участок
    
    // Генерируем тайлы карты случайно
    this.terrainMap = [];
    for (let tx = 0; tx < 200; tx++) {
      this.terrainMap[tx] = [];
      for (let ty = 0; ty < 200; ty++) {
        const rand = Math.random();
        if (rand < 0.15) {
          this.terrainMap[tx][ty] = 'water';      // 15% вода
        } else if (rand < 0.35) {
          this.terrainMap[tx][ty] = 'mountain';   // 20% холмы/горы
        } else {
          this.terrainMap[tx][ty] = 'plain';      // 65% равнина
        }
      }
    }
    
    // Создание Хаба (базовое строение в центре карты)
    const hubX = this.mapWidth / 2;
    const hubY = this.mapHeight / 2;
    this.addNode(hubX, hubY, 'hub');
    
    // Генерация 50 роутеров случайным образом на карте с минимальным расстоянием между ними
    // Роутер занимает 2x2 участка (10x10 пикселей), от него 1 участок в радиусе ничего не спавнится
    const routerPositions = [];
    for (let i = 0; i < 50; i++) {
      let tx, ty, x, y, valid;
      let attempts = 0;
      do {
        tx = Math.floor(Math.random() * 200);
        ty = Math.floor(Math.random() * 200);
        x = tx * this.tileSize + this.tileSize / 2;
        y = ty * this.tileSize + this.tileSize / 2;
        
        // Проверка: не ближе 25 метров (5 участков) от хаба
        const distToHub = Math.hypot(x - hubX, y - hubY);
        
        // Проверка: не на воде
        const terrain = this.terrainMap[tx]?.[ty] || 'plain';
        
        // Проверка: не ближе 1 участка от других роутеров
        let tooCloseToRouter = false;
        for (const pos of routerPositions) {
          const distToRouter = Math.hypot(tx - pos.tx, ty - pos.ty);
          if (distToRouter < 2) { // 1 участок в радиусе = дистанция 2
            tooCloseToRouter = true;
            break;
          }
        }
        
        valid = distToHub >= 25 && terrain !== 'water' && !tooCloseToRouter;
        attempts++;
      } while (!valid && attempts < 100);
      
      if (valid) {
        this.addNode(x, y, 'router');
        routerPositions.push({ tx, ty, x, y });
      }
    }
    
    // Для каждого роутера генерируем от 1 до 5 пользователей в радиусе 5 участков по кругу
    const userPositions = [];
    for (const router of routerPositions) {
      const userCount = Math.floor(Math.random() * 5) + 1; // 1-5 пользователей
      for (let i = 0; i < userCount; i++) {
        let tx, ty, x, y, valid;
        let attempts = 0;
        do {
          // Размещаем пользователей по кругу от роутера (в радиусе 5 участков)
          const angle = (i / userCount) * Math.PI * 2 + Math.random() * 0.5; // Равномерно по кругу с небольшим разбросом
          const distanceTiles = 2 + Math.random() * 3; // от 2 до 5 участков от роутера
          tx = Math.floor(router.tx + Math.cos(angle) * distanceTiles);
          ty = Math.floor(router.ty + Math.sin(angle) * distanceTiles);
          
          // Ограничиваем координаты тайла
          tx = Math.max(0, Math.min(199, tx));
          ty = Math.max(0, Math.min(199, ty));
          
          x = tx * this.tileSize + this.tileSize / 2;
          y = ty * this.tileSize + this.tileSize / 2;
          
          // Проверка границ карты
          valid = x >= 0 && x <= this.mapWidth && y >= 0 && y <= this.mapHeight;
          
          // Проверка: не на воде
          const terrain = this.terrainMap[tx]?.[ty] || 'plain';
          if (terrain === 'water') valid = false;
          
          // Проверка: не ближе 1 тайла от других юзеров и роутеров
          let tooClose = false;
          for (const pos of userPositions) {
            const dist = Math.hypot(tx - pos.tx, ty - pos.ty);
            if (dist < 1) {
              tooClose = true;
              break;
            }
          }
          for (const pos of routerPositions) {
            const dist = Math.hypot(tx - pos.tx, ty - pos.ty);
            if (dist < 1) {
              tooClose = true;
              break;
            }
          }
          valid = valid && !tooClose;
          attempts++;
        } while (!valid && attempts < 100);
        
        if (valid) {
          this.addNode(x, y, 'home');
          userPositions.push({ tx, ty, x, y });
        }
      }
    }
    
    // Дополнительно пользователи случайным образом по всей карте (не связанные с роутерами)
    for (let i = 0; i < 300; i++) {
      let tx, ty, x, y, valid;
      let attempts = 0;
      do {
        tx = Math.floor(Math.random() * 200);
        ty = Math.floor(Math.random() * 200);
        x = tx * this.tileSize + this.tileSize / 2;
        y = ty * this.tileSize + this.tileSize / 2;
        
        // Проверка: не ближе 25 метров (5 участков) от хаба
        const distToHub = Math.hypot(x - hubX, y - hubY);
        
        // Проверка: не на воде
        const terrain = this.terrainMap[tx]?.[ty] || 'plain';
        
        // Проверка: не ближе 1 тайла от других юзеров и роутеров
        let tooClose = false;
        for (const pos of userPositions) {
          const dist = Math.hypot(tx - pos.tx, ty - pos.ty);
          if (dist < 1) {
            tooClose = true;
            break;
          }
        }
        for (const pos of routerPositions) {
          const dist = Math.hypot(tx - pos.tx, ty - pos.ty);
          if (dist < 1) {
            tooClose = true;
            break;
          }
        }
        
        valid = distToHub >= 25 && terrain !== 'water' && !tooClose;
        attempts++;
      } while (!valid && attempts < 100);
      
      if (valid) {
        this.addNode(x, y, 'home');
        userPositions.push({ tx, ty, x, y });
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
      this.calculateInfoGain();
      this.resourceAccumulator -= 1.0;
    }
    
    // Пересчет метрик
    this.calculateMetrics();
  }

  /**
   * Расчет дохода от узлов (устаревший метод, оставлен для совместимости)
   */
  calculateIncome() {
    let totalInfluence = 0;
    let totalData = 0;
    
    for (const node of this.nodes) {
      // Одинокий узел тоже приносит доход
      const isAlone = this.nodes.length === 1;
      // Узел дает доход если подключен к сети (имеет соединения) или он один
      if (isAlone || node.connections.length > 0) {
        totalInfluence += node.energyCost || 0;
        totalData += node.throughput || 0;
      }
    }
    
    this.incomePerSecond = {
      influence: totalInfluence,
      data: totalData
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
    
    // Добавляем информацию к доходу data
    this.incomePerSecond.data = (this.incomePerSecond.data || 0) + totalInfoGain;
    
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
    
    // Находим Хаб
    const hub = this.nodes.find(n => n.type === 'hub');
    if (!hub) return 0;
    
    let totalLatency = 0;
    let pathCount = 0;
    
    // Считаем задержку от каждого home узла до хаба
    const homeNodes = this.nodes.filter(n => n.type === 'home');
    
    for (const home of homeNodes) {
      const path = this.pathfinding.findPath(home.id, hub.id);
      
      if (path && path.length > 1) {
        // Задержка = количество хопов × базовая задержка (5ms)
        const hops = path.length - 1;
        const latency = hops * 5;
        
        totalLatency += latency;
        pathCount++;
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
   * Определение типа местности по координатам (использует terrainMap)
   */
  getTerrainType(x, y) {
    // Используем сгенерированную карту тайлов
    if (!this.terrainMap || !this.tileSize) {
      // Fallback для старой логики если карта еще не сгенерирована
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
    
    // Конвертируем пиксели в тайлы
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    
    // Проверяем границы
    if (tx < 0 || tx >= 200 || ty < 0 || ty >= 200) {
      return 'plain';
    }
    
    return this.terrainMap[tx]?.[ty] || 'plain';
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
