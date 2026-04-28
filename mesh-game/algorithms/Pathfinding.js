/**
 * Алгоритмы поиска пути и маршрутизации
 * Реализует Dijkstra для нахождения оптимальных путей в сети
 */
export class Pathfinding {
  /**
   * @param {NetworkSimulator} network - Сеть для поиска пути
   */
  constructor(network) {
    this.network = network;
  }

  /**
   * Поиск пути алгоритмом Dijkstra с весами
   * @param {string} startId - ID начального узла
   * @param {string} endId - ID конечного узла
   * @param {object} weights - Веса для расчета стоимости ребер
   * @param {number} weights.distance - Вес расстояния (по умолчанию 1)
   * @param {number} weights.load - Вес нагрузки (по умолчанию 0.5)
   * @param {number} weights.stability - Вес стабильности (по умолчанию 0.3)
   * @returns {Node[]|null} - Массив узлов пути или null если путь не найден
   */
  findPath(startId, endId, weights = { distance: 1, load: 0.5, stability: 0.3 }) {
    const nodes = this.network.nodes;
    const nodesMap = new Map(nodes.map(n => [n.id, n]));
    
    const startNode = nodesMap.get(startId);
    const endNode = nodesMap.get(endId);
    
    if (!startNode || !endNode) return null;
    if (startNode === endNode) return [startNode];
    
    // Расстояния до узлов (бесконечность по умолчанию)
    const distances = new Map();
    const previous = new Map();
    const visited = new Set();
    
    // Инициализация
    for (const node of nodes) {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
    }
    distances.set(startId, 0);
    
    // Приоритетная очередь (упрощенная реализация)
    const queue = [...nodes];
    
    while (queue.length > 0) {
      // Находим узел с минимальным расстоянием
      let minIndex = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < queue.length; i++) {
        const dist = distances.get(queue[i].id);
        if (dist < minDistance) {
          minDistance = dist;
          minIndex = i;
        }
      }
      
      const current = queue.splice(minIndex, 1)[0];
      
      // Если достигли цели
      if (current.id === endId) {
        break;
      }
      
      // Если расстояние бесконечное, путь не найден
      if (minDistance === Infinity) {
        break;
      }
      
      visited.add(current.id);
      
      // Проверяем всех соседей
      for (const connectionId of current.connections) {
        if (visited.has(connectionId)) continue;
        
        const neighbor = nodesMap.get(connectionId);
        if (!neighbor || neighbor.status === 'offline') continue;
        
        // Расчет веса ребра
        const edgeWeight = this.calculateEdgeWeight(current, neighbor, weights);
        
        // Релаксация ребра
        const altDistance = distances.get(current.id) + edgeWeight;
        
        if (altDistance < distances.get(neighbor.id)) {
          distances.set(neighbor.id, altDistance);
          previous.set(neighbor.id, current.id);
        }
      }
    }
    
    // Восстановление пути
    if (distances.get(endId) === Infinity) {
      return null; // Путь не найден
    }
    
    const path = [];
    let current = endId;
    
    while (current !== null) {
      path.unshift(nodesMap.get(current));
      current = previous.get(current);
    }
    
    return path;
  }

  /**
   * Расчет веса ребра между двумя узлами
   * @param {Node} from - Начальный узел
   * @param {Node} to - Конечный узел
   * @param {object} weights - Веса параметров
   * @returns {number}
   */
  calculateEdgeWeight(from, to, weights) {
    // Расстояние
    const distance = from.getDistanceTo(to);
    const maxRange = Math.max(from.getEffectiveRadius(), to.getEffectiveRadius());
    const normalizedDistance = distance / maxRange;
    
    // Нагрузка на целевой узел
    const load = to.load;
    
    // Стабильность соединения (на основе статуса узла)
    const stability = to.status === 'active' ? 0 : (to.status === 'overloaded' ? 0.5 : 1);
    
    // Комбинированный вес
    let weight = 0;
    weight += normalizedDistance * (weights.distance || 1);
    weight += load * (weights.load || 0.5);
    weight += stability * (weights.stability || 0.3);
    
    // Штраф за слабое соединение
    const edge = this.network.getEdgeBetween(from, to);
    if (edge && edge.strength < 0.5) {
      weight += (1 - edge.strength) * 2;
    }
    
    return weight;
  }

  /**
   * Поиск всех путей между двумя узлами (для резервирования)
   * @param {string} startId
   * @param {string} endId
   * @param {number} maxPaths - Максимальное количество путей
   * @returns {Node[][]}
   */
  findAllPaths(startId, endId, maxPaths = 3) {
    const paths = [];
    const nodes = this.network.nodes;
    const nodesMap = new Map(nodes.map(n => [n.id, n]));
    
    const startNode = nodesMap.get(startId);
    const endNode = nodesMap.get(endId);
    
    if (!startNode || !endNode) return paths;
    
    // DFS для поиска путей
    const dfs = (currentId, path, visited) => {
      if (paths.length >= maxPaths) return;
      
      const currentNode = nodesMap.get(currentId);
      path.push(currentNode);
      visited.add(currentId);
      
      if (currentId === endId) {
        paths.push([...path]);
      } else {
        for (const connectionId of currentNode.connections) {
          if (!visited.has(connectionId)) {
            const neighbor = nodesMap.get(connectionId);
            if (neighbor && neighbor.status !== 'offline') {
              dfs(connectionId, path, visited);
            }
          }
        }
      }
      
      path.pop();
      visited.delete(currentId);
    };
    
    dfs(startId, [], new Set());
    
    return paths;
  }

  /**
   * Пересчет всех маршрутов в сети
   * Обновляет информацию о путях между всеми парами узлов
   */
  recalculateRoutes() {
    // Можно использовать для кэширования часто используемых маршрутов
    // В текущей реализации пути вычисляются по требованию
  }

  /**
   * Расчет средней задержки для пути
   * @param {Node[]} path
   * @returns {number} - Задержка в мс
   */
  calculateLatency(path) {
    if (!path || path.length < 2) return 0;
    
    let totalLatency = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      const node = path[i];
      const nextNode = path[i + 1];
      
      // Базовая задержка + задержка от нагрузки
      const nodeLatency = 10 + (node.load / node.capacity) * 50;
      
      // Задержка от расстояния
      const distance = node.getDistanceTo(nextNode);
      const distanceLatency = distance / 10;
      
      totalLatency += nodeLatency + distanceLatency;
    }
    
    return totalLatency;
  }

  /**
   * Проверка связности сети
   * @returns {boolean}
   */
  isNetworkConnected() {
    const nodes = this.network.nodes.filter(n => n.status !== 'offline');
    if (nodes.length === 0) return true;
    
    const visited = new Set();
    const queue = [nodes[0]];
    visited.add(nodes[0].id);
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      for (const connectionId of current.connections) {
        const neighbor = nodes.find(n => n.id === connectionId);
        if (neighbor && !visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push(neighbor);
        }
      }
    }
    
    return visited.size === nodes.length;
  }
}
