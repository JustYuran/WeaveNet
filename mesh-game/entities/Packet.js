/**
 * Класс пакета данных, перемещающегося по сети
 */
export class Packet {
  constructor(id, fromNode, toNode, path) {
    this.id = id;
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.path = path;           // Массив ID узлов маршрута
    this.currentPathIndex = 0;  // Текущая позиция в маршруте
    this.progress = 0;          // Прогресс между узлами (0-1)
    this.speed = 150;           // Пикселей в секунду
    this.completed = false;
    this.createdAt = Date.now();
  }

  /**
   * Обновление позиции пакета
   */
  update(deltaTime, network) {
    if (this.path.length < 2) {
      this.completed = true;
      return;
    }

    const currentNodeId = this.path[this.currentPathIndex];
    const nextNodeId = this.path[this.currentPathIndex + 1];
    
    const currentNode = network.getNodeById(currentNodeId);
    const nextNode = network.getNodeById(nextNodeId);
    
    if (!currentNode || !nextNode) {
      this.completed = true;
      return;
    }

    // Движение к следующему узлу
    const distance = currentNode.getDistanceTo(nextNode);
    const moveAmount = (this.speed * deltaTime) / distance;
    this.progress += moveAmount;

    if (this.progress >= 1) {
      this.currentPathIndex++;
      this.progress = 0;
      
      if (this.currentPathIndex >= this.path.length - 1) {
        this.completed = true;
      }
    }
  }

  /**
   * Получение текущей позиции (x, y)
   */
  getPosition(network) {
    if (this.path.length < 2) {
      const node = network.getNodeById(this.toNode);
      return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
    }

    const currentNodeId = this.path[this.currentPathIndex];
    const nextNodeId = this.path[this.currentPathIndex + 1];
    
    const currentNode = network.getNodeById(currentNodeId);
    const nextNode = network.getNodeById(nextNodeId);
    
    if (!currentNode || !nextNode) {
      return { x: 0, y: 0 };
    }

    // Интерполяция между узлами
    return {
      x: currentNode.x + (nextNode.x - currentNode.x) * this.progress,
      y: currentNode.y + (nextNode.y - currentNode.y) * this.progress
    };
  }

  /**
   * Серийнаялизация
   */
  toJSON() {
    return {
      id: this.id,
      fromNodeId: this.fromNode,
      toNodeId: this.toNode,
      path: [...this.path],
      currentPathIndex: this.currentPathIndex,
      progress: this.progress,
      createdAt: this.createdAt
    };
  }
}
