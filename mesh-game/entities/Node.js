/**
 * Класс узла сети
 * Представляет отдельный узел в mesh-сети (телефон, роутер, кэш и т.д.)
 */
export class Node {
  constructor(id, x, y, type) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    
    // Параметры узла (будут установлены из конфига)
    this.radius = 50;           // Радиус действия
    this.capacity = 50;         // Пропускная способность Mbps
    this.load = 0;              // Текущая нагрузка (0-1)
    this.energy = 100;          // Энергия %
    this.status = 'active';     // active, overloaded, offline
    this.connections = [];      // ID соседних узлов
    
    // Апгрейды
    this.upgrades = {
      range: 0,
      capacity: 0,
      efficiency: 0
    };
    
    // Визуальные параметры
    this.selected = false;
    this.hovered = false;
    this.pulse = 0;             // Для анимации
  }

  /**
   * Обновление состояния узла
   * @param {number} deltaTime - Время с последнего кадра (мс)
   * @param {object} config - Конфигурация типа узла
   */
  update(deltaTime, config) {
    // Восстановление энергии
    if (this.energy < 100 && this.status !== 'offline') {
      this.energy += config.energyConsumption * 0.01 * (deltaTime / 16);
      if (this.energy > 100) this.energy = 100;
    }
    
    // Проверка перегрузки
    const overloadThreshold = 0.9;
    if (this.load > overloadThreshold) {
      this.status = 'overloaded';
    } else if (this.energy <= 0) {
      this.status = 'offline';
    } else {
      this.status = 'active';
    }
    
    // Анимация пульсации
    if (this.hovered || this.selected) {
      this.pulse += 0.05;
    } else {
      this.pulse = 0;
    }
  }

  /**
   * Проверка возможности соединения с другим узлом
   * @param {Node} otherNode - Другой узел
   * @returns {boolean}
   */
  canConnectTo(otherNode) {
    if (otherNode === this) return false;
    if (this.status === 'offline' || otherNode.status === 'offline') return false;
    
    const distance = this.getDistanceTo(otherNode);
    const effectiveRadius = this.getEffectiveRadius();
    
    return distance <= effectiveRadius;
  }

  /**
   * Расчет расстояния до другого узла
   * @param {Node} otherNode
   * @returns {number}
   */
  getDistanceTo(otherNode) {
    const dx = this.x - otherNode.x;
    const dy = this.y - otherNode.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Получение эффективного радиуса с учетом апгрейдов
   * @returns {number}
   */
  getEffectiveRadius() {
    return this.radius * (1 + this.upgrades.range * 0.2);
  }

  /**
   * Получение эффективной пропускной способности
   * @returns {number}
   */
  getEffectiveCapacity() {
    return this.capacity * (1 + this.upgrades.capacity * 0.3);
  }

  /**
   * Добавление нагрузки на узел
   * @param {number} amount - Количество нагрузки (0-1)
   */
  addLoad(amount) {
    this.load = Math.min(1, this.load + amount);
  }

  /**
   * Сброс нагрузки
   */
  resetLoad() {
    this.load = Math.max(0, this.load - 0.1);
  }

  /**
   * Сериализация узла для сохранения
   * @returns {object}
   */
  serialize() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      type: this.type,
      energy: this.energy,
      upgrades: {...this.upgrades},
      connections: [...this.connections]
    };
  }

  /**
   * Десериализация узла из сохраненных данных
   * @param {object} data
   * @param {string} type
   * @param {number} radius
   * @param {number} capacity
   * @returns {Node}
   */
  static deserialize(data, type, radius, capacity) {
    const node = new Node(data.id, data.x, data.y, type);
    node.energy = data.energy;
    node.upgrades = data.upgrades || {};
    node.connections = data.connections || [];
    node.radius = radius;
    node.capacity = capacity;
    return node;
  }
}
