/**
 * Алгоритм поиска пути Dijkstra
 */
export class Pathfinding {
  constructor(network) {
    this.network = network;
  }

  /**
   * Поиск кратчайшего пути между узлами
   * @param {string} startId - ID начального узла
   * @param {string} endId - ID конечного узла
   * @param {object} weights - Веса ребер (distance, load, encryption)
   */
  findPath(startId, endId, weights = { distance: 1, load: 0.5 }) {
    const nodes = this.network.nodes;
    const startNode = this.network.getNodeById(startId);
    const endNode = this.network.getNodeById(endId);

    if (!startNode || !endNode) {
      return null;
    }

    if (startId === endId) {
      return [startId];
    }

    // Инициализация
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set();

    for (const node of nodes) {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
      unvisited.add(node.id);
    }

    distances.set(startId, 0);

    // Основной цикл Dijkstra
    while (unvisited.size > 0) {
      // Выбор узла с минимальным расстоянием
      let currentId = null;
      let minDist = Infinity;

      for (const id of unvisited) {
        const dist = distances.get(id);
        if (dist < minDist) {
          minDist = dist;
          currentId = id;
        }
      }

      if (currentId === null || minDist === Infinity) {
        break; // Нет доступных путей
      }

      unvisited.delete(currentId);

      // Если достигли цели
      if (currentId === endId) {
        break;
      }

      const currentNode = this.network.getNodeById(currentId);

      // Перебор соседей
      for (const neighborId of currentNode.connections) {
        if (!unvisited.has(neighborId)) continue;

        const neighborNode = this.network.getNodeById(neighborId);
        
        // Расчет веса ребра
        const edgeWeight = this.calculateEdgeWeight(
          currentNode, 
          neighborNode, 
          weights
        );

        const altDistance = distances.get(currentId) + edgeWeight;

        if (altDistance < distances.get(neighborId)) {
          distances.set(neighborId, altDistance);
          previous.set(neighborId, currentId);
        }
      }
    }

    // Восстановление пути
    const path = [];
    let current = endId;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current);
    }

    // Проверка валидности пути
    if (path.length === 0 || path[0] !== startId) {
      return null;
    }

    return path;
  }

  /**
   * Расчет веса ребра между узлами
   */
  calculateEdgeWeight(nodeA, nodeB, weights) {
    const distance = nodeA.getDistanceTo(nodeB);
    const normalizedDistance = distance / Math.max(nodeA.radius, nodeB.radius);

    // Базовый вес: расстояние
    let weight = normalizedDistance * (weights.distance || 1);

    // Учет нагрузки
    const avgLoad = (nodeA.load + nodeB.load) / 2;
    weight += (avgLoad / 100) * (weights.load || 0.5);

    // Штраф за плохое качество соединения
    const edge = this.network.getEdgeBetween(nodeA.id, nodeB.id);
    if (edge) {
      weight += (100 - edge.quality) / 100;
    }

    return weight;
  }

  /**
   * Пересчет всех маршрутов в сети
   */
  recalculateRoutes() {
    // Можно использовать для кэширования маршрутов
    // В текущей реализации маршруты считаются on-demand
    return true;
  }
}
