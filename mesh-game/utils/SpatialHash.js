/**
 * Пространственный хеш для оптимизации поиска соседей
 * Разделяет пространство на ячейки для быстрого поиска узлов в радиусе
 */
export class SpatialHash {
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this.cells = new Map();  // Ключ: "x,y" -> Значение: массив узлов
  }

  /**
   * Получение ключа ячейки для координат
   * @param {number} x
   * @param {number} y
   * @returns {string}
   */
  getKey(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  /**
   * Вставка узла в хеш
   * @param {Node} node
   */
  insert(node) {
    const key = this.getKey(node.x, node.y);
    
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    
    this.cells.get(key).push(node);
  }

  /**
   * Удаление узла из хеша
   * @param {Node} node
   */
  remove(node) {
    const key = this.getKey(node.x, node.y);
    const cell = this.cells.get(key);
    
    if (cell) {
      const index = cell.indexOf(node);
      if (index !== -1) {
        cell.splice(index, 1);
      }
      
      // Удаляем пустую ячейку
      if (cell.length === 0) {
        this.cells.delete(key);
      }
    }
  }

  /**
   * Обновление позиции узла в хеше
   * @param {Node} node
   * @param {number} oldX - Старая позиция X
   * @param {number} oldY - Старая позиция Y
   */
  update(node, oldX, oldY) {
    const oldKey = this.getKey(oldX, oldY);
    const newKey = this.getKey(node.x, node.y);
    
    // Если узел переместился в другую ячейку
    if (oldKey !== newKey) {
      this.removeByKey(node, oldKey);
      this.insert(node);
    }
  }

  /**
   * Удаление узла по ключу ячейки
   * @param {Node} node
   * @param {string} key
   */
  removeByKey(node, key) {
    const cell = this.cells.get(key);
    
    if (cell) {
      const index = cell.indexOf(node);
      if (index !== -1) {
        cell.splice(index, 1);
      }
      
      if (cell.length === 0) {
        this.cells.delete(key);
      }
    }
  }

  /**
   * Поиск узлов в радиусе от точки
   * @param {number} x - Координата X центра
   * @param {number} y - Координата Y центра
   * @param {number} radius - Радиус поиска
   * @param {Node} exclude - Узел для исключения из результатов
   * @returns {Node[]}
   */
  queryRange(x, y, radius, exclude = null) {
    const results = [];
    
    // Определяем диапазон ячеек для проверки
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellY = Math.floor((y - radius) / this.cellSize);
    const maxCellY = Math.floor((y + radius) / this.cellSize);
    
    // Проверяем все ячейки в диапазоне
    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        const key = `${cellX},${cellY}`;
        const cell = this.cells.get(key);
        
        if (cell) {
          for (const node of cell) {
            // Исключаем указанный узел
            if (node === exclude) continue;
            
            // Проверяем расстояние
            const dx = node.x - x;
            const dy = node.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
              results.push(node);
            }
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Поиск всех узлов в прямоугольной области
   * @param {number} minX
   * @param {number} minY
   * @param {number} maxX
   * @param {number} maxY
   * @returns {Node[]}
   */
  queryRect(minX, minY, maxX, maxY) {
    const results = [];
    
    const minCellX = Math.floor(minX / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const minCellY = Math.floor(minY / this.cellSize);
    const maxCellY = Math.floor(maxY / this.cellSize);
    
    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        const key = `${cellX},${cellY}`;
        const cell = this.cells.get(key);
        
        if (cell) {
          for (const node of cell) {
            if (node.x >= minX && node.x <= maxX &&
                node.y >= minY && node.y <= maxY) {
              results.push(node);
            }
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Очистка всего хеша
   */
  clear() {
    this.cells.clear();
  }

  /**
   * Получение количества узлов в хеше
   * @returns {number}
   */
  size() {
    let count = 0;
    for (const cell of this.cells.values()) {
      count += cell.length;
    }
    return count;
  }

  /**
   * Перестроение хеша из массива узлов
   * @param {Node[]} nodes
   */
  rebuild(nodes) {
    this.clear();
    for (const node of nodes) {
      this.insert(node);
    }
  }
}
