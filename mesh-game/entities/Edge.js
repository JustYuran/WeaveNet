/**
 * Класс соединения (ребра графа)
 * Представляет связь между двумя узлами сети
 */
export class Edge {
  constructor(id, nodeA, nodeB) {
    this.id = id;
    this.nodeA = nodeA;       // Ссылка на первый узел
    this.nodeB = nodeB;       // Ссылка на второй узел
    this.strength = 1;        // Сила связи (0-1)
    this.load = 0;            // Нагрузка на соединение (0-1)
    this.latency = 0;         // Задержка в мс
    this.active = true;       // Активно ли соединение
    this.packets = [];        // Пакеты, проходящие через это соединение
  }

  /**
   * Обновление состояния соединения
   * @param {number} deltaTime - Время с последнего кадра (мс)
   */
  update(deltaTime) {
    // Расчет силы связи на основе расстояния
    const dx = this.nodeA.x - this.nodeB.x;
    const dy = this.nodeA.y - this.nodeB.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.min(
      this.nodeA.getEffectiveRadius(),
      this.nodeB.getEffectiveRadius()
    );
    
    this.strength = Math.max(0, 1 - (distance / maxDistance));
    
    // Деактивация если узлы offline
    if (this.nodeA.status === 'offline' || this.nodeB.status === 'offline') {
      this.active = false;
    } else {
      this.active = this.strength > 0.3;
    }
    
    // Расчет задержки
    if (this.active) {
      this.latency = 10 + (distance / 10) * (1 + this.load);
    } else {
      this.latency = Infinity;
    }
    
    // Постепенное снижение нагрузки
    this.load = Math.max(0, this.load - 0.01 * (deltaTime / 16));
  }

  /**
   * Добавление пакета на соединение
   * @param {Packet} packet
   */
  addPacket(packet) {
    this.packets.push(packet);
    this.load = Math.min(1, this.load + 0.1);
  }

  /**
   * Удаление завершившегося пакета
   * @param {Packet} packet
   */
  removePacket(packet) {
    const index = this.packets.indexOf(packet);
    if (index !== -1) {
      this.packets.splice(index, 1);
    }
  }

  /**
   * Получение длины соединения
   * @returns {number}
   */
  getLength() {
    return this.nodeA.getDistanceTo(this.nodeB);
  }

  /**
   * Проверка принадлежности узла соединению
   * @param {Node} node
   * @returns {boolean}
   */
  containsNode(node) {
    return this.nodeA === node || this.nodeB === node;
  }

  /**
   * Получение другого узла соединения
   * @param {Node} node
   * @returns {Node|null}
   */
  getOtherNode(node) {
    if (this.nodeA === node) return this.nodeB;
    if (this.nodeB === node) return this.nodeA;
    return null;
  }

  /**
   * Сериализация для сохранения
   * @returns {object}
   */
  serialize() {
    return {
      id: this.id,
      nodeAId: this.nodeA.id,
      nodeBId: this.nodeB.id,
      strength: this.strength,
      load: this.load
    };
  }

  /**
   * Десериализация из сохраненных данных
   * @param {object} data
   * @param {Map} nodesMap - Карта узлов по ID
   * @returns {Edge|null}
   */
  static deserialize(data, nodesMap) {
    const nodeA = nodesMap.get(data.nodeAId);
    const nodeB = nodesMap.get(data.nodeBId);
    
    if (!nodeA || !nodeB) return null;
    
    const edge = new Edge(data.id, nodeA, nodeB);
    edge.strength = data.strength;
    edge.load = data.load;
    return edge;
  }
}
