/**
 * Пространственный хэш для быстрого поиска соседей
 */
export class SpatialHash {
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  /**
   * Получение ключа ячейки по координатам
   */
  getKey(x, y) {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    return `${gx},${gy}`;
  }

  /**
   * Вставка узла в хэш
   */
  insert(node) {
    const key = this.getKey(node.x, node.y);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key).push(node);
  }

  /**
   * Очистка хэша
   */
  clear() {
    this.cells.clear();
  }

  /**
   * Запрос узлов в диапазоне
   */
  queryRange(x, y, radius) {
    const results = [];
    const minGx = Math.floor((x - radius) / this.cellSize);
    const maxGx = Math.floor((x + radius) / this.cellSize);
    const minGy = Math.floor((y - radius) / this.cellSize);
    const maxGy = Math.floor((y + radius) / this.cellSize);

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gy = minGy; gy <= maxGy; gy++) {
        const key = `${gx},${gy}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (const node of cell) {
            const dist = Math.hypot(node.x - x, node.y - y);
            if (dist <= radius) {
              results.push(node);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Поиск ближайших соседей для узла
   */
  findNeighbors(node, allNodes) {
    // Перестраиваем хэш для всех узлов
    this.clear();
    for (const n of allNodes) {
      this.insert(n);
    }

    // Ищем соседей в радиусе действия узла
    return this.queryRange(node.x, node.y, node.radius);
  }
}
