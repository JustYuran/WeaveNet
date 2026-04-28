/**
 * Класс соединения между узлами
 */
export class Edge {
  constructor(id, nodeA, nodeB) {
    this.id = id;
    this.nodeA = nodeA;
    this.nodeB = nodeB;
    this.load = 0;       // Нагрузка на соединение (0-100%)
    this.quality = 100;  // Качество связи (0-100%)
    this.active = true;
  }

  /**
   * Обновление состояния соединения
   */
  update(deltaTime) {
    // Расчет качества связи на основе расстояния
    const distance = Math.hypot(
      this.nodeA.x - this.nodeB.x,
      this.nodeA.y - this.nodeB.y
    );
    
    const maxDistance = Math.min(this.nodeA.radius, this.nodeB.radius);
    const distanceRatio = distance / maxDistance;
    
    // Качество падает с расстоянием
    this.quality = Math.max(0, 100 - (distanceRatio * 50));
    
    // Учет нагрузки узлов
    const avgLoad = (this.nodeA.load + this.nodeB.load) / 2;
    this.load = avgLoad;
    
    // Соединение неактивно если один из узлов offline
    this.active = (this.nodeA.status !== 'offline' && 
                   this.nodeB.status !== 'offline');
  }

  /**
   * Получение цвета соединения на основе качества
   */
  getColor() {
    if (!this.active) return '#444444';
    
    if (this.quality > 70) return '#00ff88';      // Зеленый
    if (this.quality > 40) return '#ffaa00';      // Оранжевый
    return '#ff4444';                              // Красный
  }

  /**
   * Получение толщины линии на основе нагрузки
   */
  getWidth() {
    return 1 + (this.load / 100) * 3;
  }

  /**
   * Получение прозрачности на основе качества
   */
  getAlpha() {
    return 0.3 + (this.quality / 100) * 0.7;
  }

  /**
   * Серийнаялизация
   */
  toJSON() {
    return {
      id: this.id,
      nodeAId: this.nodeA.id,
      nodeBId: this.nodeB.id,
      load: this.load,
      quality: this.quality,
      active: this.active
    };
  }
}
