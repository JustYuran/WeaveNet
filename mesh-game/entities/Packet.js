/**
 * Класс пакета данных
 * Представляет пакет, передаваемый между узлами сети
 */
export class Packet {
  constructor(id, fromNode, toNode, path) {
    this.id = id;
    this.fromNode = fromNode;     // Узел отправитель
    this.toNode = toNode;         // Узел получатель
    this.path = path;             // Массив узлов пути [from, ..., to]
    this.currentPathIndex = 0;    // Текущая позиция в пути
    
    // Позиция пакета (для анимации)
    this.x = fromNode.x;
    this.y = fromNode.y;
    
    // Прогресс движения между узлами (0-1)
    this.progress = 0;
    
    // Скорость движения (пикселей в секунду)
    this.speed = 150;
    
    // Размер пакета для визуализации
    this.size = 4;
    
    // Время жизни пакета
    this.birthTime = Date.now();
    this.maxLifetime = 30000;     // 30 секунд макс
    
    // Статус
    this.delivered = false;
    this.dropped = false;
  }

  /**
   * Обновление позиции пакета
   * @param {number} deltaTime - Время с последнего кадра (мс)
   * @returns {boolean} - false если пакет достиг цели или потерян
   */
  update(deltaTime) {
    if (this.delivered || this.dropped) return false;
    
    // Проверка времени жизни
    if (Date.now() - this.birthTime > this.maxLifetime) {
      this.dropped = true;
      return false;
    }
    
    // Движение по пути
    const moveSpeed = this.speed * (deltaTime / 1000);
    this.progress += moveSpeed / this.getCurrentEdgeLength();
    
    // Если достигли текущего узла пути
    while (this.progress >= 1 && this.currentPathIndex < this.path.length - 1) {
      this.progress -= 1;
      this.currentPathIndex++;
      
      // Добавляем нагрузку на узел
      const currentNode = this.path[this.currentPathIndex];
      currentNode.addLoad(0.02);
      
      // Проверка: если узел перегружен, пакет может быть потерян
      if (currentNode.status === 'offline') {
        this.dropped = true;
        return false;
      }
    }
    
    // Если достигли конечного узла
    if (this.currentPathIndex >= this.path.length - 1 && this.progress >= 1) {
      this.delivered = true;
      this.x = this.toNode.x;
      this.y = this.toNode.y;
      return false;
    }
    
    // Обновление позиции
    this.updatePosition();
    
    return true;
  }

  /**
   * Обновление визуальной позиции пакета
   */
  updatePosition() {
    const currentNode = this.path[this.currentPathIndex];
    const nextNode = this.path[this.currentPathIndex + 1];
    
    if (!nextNode) {
      this.x = currentNode.x;
      this.y = currentNode.y;
      return;
    }
    
    // Интерполяция между узлами
    const dx = nextNode.x - currentNode.x;
    const dy = nextNode.y - currentNode.y;
    
    this.x = currentNode.x + dx * this.progress;
    this.y = currentNode.y + dy * this.progress;
  }

  /**
   * Получение длины текущего ребра пути
   * @returns {number}
   */
  getCurrentEdgeLength() {
    const currentNode = this.path[this.currentPathIndex];
    const nextNode = this.path[this.currentPathIndex + 1];
    
    if (!nextNode) return 0;
    
    const dx = nextNode.x - currentNode.x;
    const dy = nextNode.y - currentNode.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Получение текущего узла, на котором находится пакет
   * @returns {Node}
   */
  getCurrentNode() {
    return this.path[this.currentPathIndex];
  }

  /**
   * Получение следующего узла пути
   * @returns {Node|null}
   */
  getNextNode() {
    return this.path[this.currentPathIndex + 1] || null;
  }

  /**
   * Расчет пройденного расстояния
   * @returns {number}
   */
  getDistanceTraveled() {
    let distance = 0;
    
    for (let i = 0; i < this.currentPathIndex; i++) {
      const dx = this.path[i + 1].x - this.path[i].x;
      const dy = this.path[i + 1].y - this.path[i].y;
      distance += Math.sqrt(dx * dx + dy * dy);
    }
    
    // Добавляем текущий прогресс
    if (this.currentPathIndex < this.path.length - 1) {
      distance += this.getCurrentEdgeLength() * this.progress;
    }
    
    return distance;
  }

  /**
   * Расчет общего расстояния пути
   * @returns {number}
   */
  getTotalPathLength() {
    let distance = 0;
    
    for (let i = 0; i < this.path.length - 1; i++) {
      const dx = this.path[i + 1].x - this.path[i].x;
      const dy = this.path[i + 1].y - this.path[i].y;
      distance += Math.sqrt(dx * dx + dy * dy);
    }
    
    return distance;
  }

  /**
   * Прогресс доставки (0-1)
   * @returns {number}
   */
  getDeliveryProgress() {
    return this.getDistanceTraveled() / this.getTotalPathLength();
  }

  /**
   * Сериализация для сохранения
   * @returns {object}
   */
  serialize() {
    return {
      id: this.id,
      fromNodeId: this.fromNode.id,
      toNodeId: this.toNode.id,
      pathIds: this.path.map(n => n.id),
      currentPathIndex: this.currentPathIndex,
      progress: this.progress,
      x: this.x,
      y: this.y,
      delivered: this.delivered,
      dropped: this.dropped
    };
  }

  /**
   * Десериализация из сохраненных данных
   * @param {object} data
   * @param {Map} nodesMap - Карта узлов по ID
   * @returns {Packet|null}
   */
  static deserialize(data, nodesMap) {
    const fromNode = nodesMap.get(data.fromNodeId);
    const toNode = nodesMap.get(data.toNodeId);
    const path = data.pathIds.map(id => nodesMap.get(id)).filter(n => n);
    
    if (!fromNode || !toNode || path.length < 2) return null;
    
    const packet = new Packet(data.id, fromNode, toNode, path);
    packet.currentPathIndex = data.currentPathIndex;
    packet.progress = data.progress;
    packet.x = data.x;
    packet.y = data.y;
    packet.delivered = data.delivered;
    packet.dropped = data.dropped;
    
    return packet;
  }
}
