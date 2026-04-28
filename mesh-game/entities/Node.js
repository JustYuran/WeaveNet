/**
 * Класс узла сети
 */
export class Node {
  constructor(id, x, y, type, config, terrainType = 'plain') {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.terrainType = terrainType;
    
    // Защита от отсутствующего конфига
    if (!config || !config.nodeTypes) {
      console.warn('Config not loaded, using defaults for node', id);
      this.config = { radius: 100, capacity: 50, income: { influence: 0.5, data: 0.2 }, cost: { influence: 10, data: 0 }, emoji: '📱' };
      this.terrainConfig = { radiusModifier: 1.0, costModifier: 1.0, buildable: true };
    } else {
      this.config = config.nodeTypes[type] || config.nodeTypes.basic;
      this.terrainConfig = (config.terrain && config.terrain[terrainType]) || (config.terrain && config.terrain.plain) || { radiusModifier: 1.0, costModifier: 1.0, buildable: true };
    }
    
    // Параметры из конфига с модификаторами местности
    const radiusMod = this.terrainConfig.radiusModifier || 1.0;
    const costMod = this.terrainConfig.costModifier || 1.0;
    
    this.baseRadius = this.config.radius;
    this.radius = this.baseRadius * radiusMod;
    this.capacity = this.config.capacity;
    this.income = this.config.income;
    this.baseCost = { 
      influence: this.config.cost.influence * costMod, 
      data: this.config.cost.data * costMod 
    };
    
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
   * Получение эмодзи для узла
   */
  getEmoji() {
    return this.config.emoji || '📱';
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
   * Получение эффективного радиуса с учетом помех
   */
  getEffectiveRadius(jammerZones) {
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
      terrainType: this.terrainType,
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
    const node = new Node(data.id, data.x, data.y, data.type, config, data.terrainType || 'plain');
    node.load = data.load;
    node.energy = data.energy;
    node.status = data.status;
    node.connections = data.connections;
    return node;
  }
}
