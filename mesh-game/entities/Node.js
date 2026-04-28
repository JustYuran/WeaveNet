/**
 * Класс узла сети
 */
export class Node {
  constructor(id, x, y, type, config) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = config[type] || config.basic;
    
    // Параметры из конфига
    this.radius = this.config.radius;
    this.capacity = this.config.capacity;
    this.income = this.config.income;
    
    // Состояние
    this.load = 0;       // Текущая нагрузка %
    this.energy = 100;   // Энергия %
    this.status = 'active'; // active, overloaded, offline, isolated
    this.connections = []; // ID соседних узлов
    
    // Визуализация
    this.hovered = false;
    this.selected = false;
    this.pulse = 0;
  }

  /**
   * Обновление состояния узла
   */
  update(deltaTime, network, jammerZones) {
    // Проверка на изоляцию (нет соединений)
    const isConnected = this.connections.length > 0;
    if (!isConnected && network.nodes.length > 1) {
      this.status = 'isolated';
    } else if (this.load > 90) {
      this.status = 'overloaded';
    } else {
      this.status = 'active';
    }

    // Проверка зон помех
    let effectiveRadius = this.radius;
    if (jammerZones && jammerZones.length > 0) {
      for (let zone of jammerZones) {
        const dist = Math.hypot(this.x - zone.x, this.y - zone.y);
        if (dist < zone.radius) {
          const strength = 1 - (dist / zone.radius) * zone.strength;
          effectiveRadius *= (1 - zone.strength * strength);
        }
      }
    }
    
    return effectiveRadius;
  }

  /**
   * Проверка возможности соединения с другим узлом
   */
  canConnectTo(otherNode, effectiveRadius = null) {
    const radius = effectiveRadius !== null ? effectiveRadius : this.radius;
    const distance = this.getDistanceTo(otherNode);
    return distance <= radius && distance <= otherNode.radius;
  }

  /**
   * Расчет расстояния до другого узла
   */
  getDistanceTo(otherNode) {
    return Math.hypot(this.x - otherNode.x, this.y - otherNode.y);
  }

  /**
   * Получение цвета статуса
   */
  getStatusColor() {
    switch (this.status) {
      case 'active': return '#00ff88';
      case 'overloaded': return '#ffaa00';
      case 'offline': return '#ff4444';
      case 'isolated': return '#888888';
      default: return '#00ff88';
    }
  }

  /**
   * Серийнаялизация для сохранения
   */
  toJSON() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      type: this.type,
      load: this.load,
      energy: this.energy,
      status: this.status,
      connections: [...this.connections]
    };
  }

  /**
   * Десериализация
   */
  static fromJSON(data, config) {
    const node = new Node(data.id, data.x, data.y, data.type, config);
    node.load = data.load;
    node.energy = data.energy;
    node.status = data.status;
    node.connections = data.connections;
    return node;
  }
}
