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
      this.config = { 
        radius: 100, 
        capacity: 50, 
        energyCost: 0,
        throughput: 0,
        isStatic: false,
        isHub: false,
        generatesData: false,
        emoji: '📱',
        color: '#00ff88',
        shape: 'circle',
        size: 10
      };
      this.terrainConfig = { radiusModifier: 1.0, costModifier: 1.0, buildable: true };
    } else {
      // Получаем конфигурацию узла по типу
      const nodeTypeConfig = config.nodeTypes[type];
      if (!nodeTypeConfig) {
        console.warn('Unknown node type:', type, 'using basic');
        this.config = config.nodeTypes.basic || config.nodeTypes.repeater || { 
          radius: 100, 
          capacity: 50, 
          energyCost: 0,
          throughput: 0,
          isStatic: false,
          isHub: false,
          generatesData: false,
          emoji: '📱',
          color: '#00ff88',
          shape: 'circle',
          size: 10
        };
      } else {
        this.config = nodeTypeConfig;
      }
      this.terrainConfig = { radiusModifier: 1.0, costModifier: 1.0, buildable: true };
    }
    
    // Параметры из конфига с модификаторами местности
    const radiusMod = this.terrainConfig.radiusModifier || 1.0;
    const costMod = this.terrainConfig.costModifier || 1.0;
    
    this.baseRadius = this.config.radius;
    this.radius = this.baseRadius * radiusMod;
    this.capacity = this.config.capacity;
    this.energyCost = this.config.energyCost || 0;
    this.throughput = this.config.throughput || 0;
    this.isStatic = this.config.isStatic || false;
    this.isHub = this.config.isHub || false;
    this.generatesData = this.config.generatesData || false;
    
    // Визуальные параметры из конфига
    this.color = this.config.color || '#00ff88';
    this.shape = this.config.shape || 'circle';
    this.size = this.config.size || 10;
    this.stealth = this.config.stealth || false;
    
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
