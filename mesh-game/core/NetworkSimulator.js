/**
 * Симулятор mesh-сети
 * Управляет узлами, соединениями и пакетами данных
 */
import { Node } from '../entities/Node.js';
import { Edge } from '../entities/Edge.js';
import { Packet } from '../entities/Packet.js';
import { SpatialHash } from '../utils/SpatialHash.js';
import { Pathfinding } from '../algorithms/Pathfinding.js';

export class NetworkSimulator {
  constructor(config) {
    this.nodes = [];           // Массив узлов
    this.edges = [];           // Массив соединений
    this.packets = [];         // Активные пакеты
    
    this.config = config;      // Параметры симуляции
    this.spatialHash = new SpatialHash(100);
    this.pathfinding = new Pathfinding(this);
    
    this.nextNodeId = 0;
    this.nextEdgeId = 0;
    this.nextPacketId = 0;
    
    // Целевые точки для расчета покрытия
    this.targetPoints = this.generateTargetPoints(800, 600, 200);
    
    // Зоны помех
    this.jammerZones = [];
    
    // Препятствия
    this.obstacles = [];
    
    // Статистика
    this.stats = {
      packetsSent: 0,
      packetsDelivered: 0,
      packetsDropped: 0,
      totalLatency: 0
    };
  }

  /**
   * Генерация целевых точек для расчета покрытия
   */
  generateTargetPoints(width, height, count) {
    const points = [];
    for (let i = 0; i < count; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        covered: false
      });
    }
    return points;
  }

  /**
   * Добавление узла в сеть
   * @param {number} x
   * @param {number} y
   * @param {string} type
   * @param {object} typeConfig - Конфигурация типа узла
   * @returns {Node}
   */
  addNode(x, y, type, typeConfig) {
    const node = new Node(this.nextNodeId++, x, y, type);
    node.radius = typeConfig.radius;
    node.capacity = typeConfig.capacity;
    
    this.nodes.push(node);
    this.spatialHash.insert(node);
    
    // Автоматическое соединение с соседями
    this.updateConnectionsForNode(node);
    
    return node;
  }

  /**
   * Удаление узла из сети
   * @param {string|number} nodeId
   */
  removeNode(nodeId) {
    const index = this.nodes.findIndex(n => n.id === nodeId);
    if (index === -1) return;
    
    const node = this.nodes[index];
    
    // Удаляем все соединения этого узла
    this.edges = this.edges.filter(e => 
      e.nodeA !== node && e.nodeB !== node
    );
    
    // Обновляем соединения у соседей
    for (const otherNode of this.nodes) {
      otherNode.connections = otherNode.connections.filter(id => id !== nodeId);
    }
    
    // Удаляем из массива и хеша
    this.nodes.splice(index, 1);
    this.spatialHash.remove(node);
  }

  /**
   * Обновление соединений для узла
   * @param {Node} node
   */
  updateConnectionsForNode(node) {
    const neighbors = this.spatialHash.queryRange(
      node.x, 
      node.y, 
      node.getEffectiveRadius(),
      node
    );
    
    for (const neighbor of neighbors) {
      // Проверяем взаимную возможность соединения
      if (node.canConnectTo(neighbor) && neighbor.canConnectTo(node)) {
        // Проверяем, существует ли уже соединение
        const existingEdge = this.getEdgeBetween(node, neighbor);
        
        if (!existingEdge) {
          // Создаем новое соединение
          const edge = new Edge(this.nextEdgeId++, node, neighbor);
          this.edges.push(edge);
          
          // Добавляем ID соединения в узлы
          node.connections.push(neighbor.id);
          neighbor.connections.push(node.id);
        }
      }
    }
  }

  /**
   * Обновление всех соединений в сети
   */
  updateConnections() {
    // Очищаем старые соединения
    for (const node of this.nodes) {
      node.connections = [];
    }
    this.edges = [];
    this.nextEdgeId = 0;
    
    // Перестраиваем spatial hash
    this.spatialHash.rebuild(this.nodes);
    
    // Создаем новые соединения
    for (const node of this.nodes) {
      this.updateConnectionsForNode(node);
    }
  }

  /**
   * Получение соединения между двумя узлами
   * @param {Node} nodeA
   * @param {Node} nodeB
   * @returns {Edge|null}
   */
  getEdgeBetween(nodeA, nodeB) {
    return this.edges.find(e => 
      (e.nodeA === nodeA && e.nodeB === nodeB) ||
      (e.nodeA === nodeB && e.nodeB === nodeA)
    );
  }

  /**
   * Отправка пакета от одного узла к другому
   * @param {string} fromId
   * @param {string} toId
   * @returns {Packet|null}
   */
  routePacket(fromId, toId) {
    const path = this.pathfinding.findPath(fromId, toId);
    
    if (!path || path.length < 2) {
      this.stats.packetsDropped++;
      return null;
    }
    
    const fromNode = this.nodes.find(n => n.id === fromId);
    const toNode = this.nodes.find(n => n.id === toId);
    
    if (!fromNode || !toNode) return null;
    
    const packet = new Packet(this.nextPacketId++, fromNode, toNode, path);
    this.packets.push(packet);
    this.stats.packetsSent++;
    
    return packet;
  }

  /**
   * Один шаг симуляции
   * @param {number} deltaTime - Время в мс
   */
  simulateTick(deltaTime) {
    // Обновление узлов
    for (const node of this.nodes) {
      const typeConfig = this.config.nodeTypes[node.type];
      if (typeConfig) {
        node.update(deltaTime, typeConfig);
      }
    }
    
    // Обновление соединений
    for (const edge of this.edges) {
      edge.update(deltaTime);
    }
    
    // Обновление пакетов
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const packet = this.packets[i];
      const active = packet.update(deltaTime);
      
      if (!active) {
        // Пакет достиг цели или потерян
        if (packet.delivered) {
          this.stats.packetsDelivered++;
          this.stats.totalLatency += Date.now() - packet.birthTime;
        } else if (packet.dropped) {
          this.stats.packetsDropped++;
        }
        
        this.packets.splice(i, 1);
      }
    }
    
    // Обновление покрытия целевых точек
    this.updateCoverage();
    
    // Сброс нагрузки на узлах (постепенный)
    for (const node of this.nodes) {
      node.resetLoad();
    }
  }

  /**
   * Обновление статуса покрытия целевых точек
   */
  updateCoverage() {
    for (const point of this.targetPoints) {
      point.covered = false;
      
      for (const node of this.nodes) {
        if (node.status === 'offline') continue;
        
        const dx = node.x - point.x;
        const dy = node.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= node.getEffectiveRadius()) {
          point.covered = true;
          break;
        }
      }
    }
  }

  /**
   * Расчет процента покрытия
   * @returns {number}
   */
  getCoverage() {
    if (this.targetPoints.length === 0) return 0;
    
    const covered = this.targetPoints.filter(p => p.covered).length;
    return (covered / this.targetPoints.length) * 100;
  }

  /**
   * Получение метрик сети
   * @returns {object}
   */
  getMetrics() {
    const activeNodes = this.nodes.filter(n => n.status === 'active').length;
    const overloadedNodes = this.nodes.filter(n => n.status === 'overloaded').length;
    const offlineNodes = this.nodes.filter(n => n.status === 'offline').length;
    
    // Средняя задержка
    let avgLatency = 0;
    if (this.edges.length > 0) {
      const totalLatency = this.edges.reduce((sum, e) => sum + e.latency, 0);
      avgLatency = totalLatency / this.edges.length;
    }
    
    // Стабильность (процент активных узлов)
    const stability = this.nodes.length > 0 
      ? (activeNodes / this.nodes.length) * 100 
      : 0;
    
    // Коэффициент доставки пакетов
    const deliveryRate = this.stats.packetsSent > 0
      ? (this.stats.packetsDelivered / this.stats.packetsSent) * 100
      : 100;
    
    return {
      totalNodes: this.nodes.length,
      activeNodes,
      overloadedNodes,
      offlineNodes,
      totalEdges: this.edges.length,
      activePackets: this.packets.length,
      coverage: this.getCoverage(),
      avgLatency: Math.round(avgLatency),
      stability: Math.round(stability),
      deliveryRate: Math.round(deliveryRate),
      packetsSent: this.stats.packetsSent,
      packetsDelivered: this.stats.packetsDelivered,
      packetsDropped: this.stats.packetsDropped
    };
  }

  /**
   * Проверка влияния зон помех на узлы
   * @param {number} deltaTime
   */
  updateJammerZones(deltaTime) {
    for (const zone of this.jammerZones) {
      for (const node of this.nodes) {
        const dx = node.x - zone.x;
        const dy = node.y - zone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= zone.radius) {
          // Узел в зоне помех - снижаем радиус действия
          node.addLoad(0.01 * (deltaTime / 16));
        }
      }
    }
  }

  /**
   * Сериализация сети для сохранения
   * @returns {object}
   */
  serialize() {
    return {
      nodes: this.nodes.map(n => n.serialize()),
      edges: this.edges.map(e => e.serialize()),
      stats: {...this.stats},
      nextNodeId: this.nextNodeId,
      nextEdgeId: this.nextEdgeId,
      nextPacketId: this.nextPacketId
    };
  }

  /**
   * Десериализация сети из сохраненных данных
   * @param {object} data
   * @param {object} config
   */
  static deserialize(data, config) {
    const network = new NetworkSimulator(config);
    
    // Восстанавливаем узлы
    const nodesMap = new Map();
    for (const nodeData of data.nodes) {
      const typeConfig = config.nodeTypes[nodeData.type];
      const node = Node.deserialize(
        nodeData, 
        nodeData.type, 
        typeConfig.radius, 
        typeConfig.capacity
      );
      network.nodes.push(node);
      nodesMap.set(node.id, node);
    }
    
    // Восстанавливаем соединения
    for (const edgeData of data.edges) {
      const edge = Edge.deserialize(edgeData, nodesMap);
      if (edge) {
        network.edges.push(edge);
      }
    }
    
    // Восстанавливаем счетчики
    network.nextNodeId = data.nextNodeId;
    network.nextEdgeId = data.nextEdgeId;
    network.nextPacketId = data.nextPacketId;
    network.stats = data.stats;
    
    // Перестраиваем spatial hash
    network.spatialHash.rebuild(network.nodes);
    
    return network;
  }
}
