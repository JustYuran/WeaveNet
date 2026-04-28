/**
 * Система событий игры
 * Управляет запланированными событиями (помехи, атаки, бонусы)
 */
export class EventSystem {
  constructor(game) {
    this.game = game;
    this.activeEvents = [];      // Активные события
    this.eventQueue = [];        // Очередь запланированных событий
    this.eventIdCounter = 0;
  }

  /**
   * Планирование события
   * @param {object} eventConfig
   * @param {string} eventConfig.type - Тип события (jammer, storm, overload, surge, raid)
   * @param {number} eventConfig.time - Время активации (секунды от начала игры)
   * @param {number} eventConfig.duration - Длительность события (секунды)
   * @param {object} eventConfig.position - Позиция для зональных событий {x, y, radius}
   */
  scheduleEvent(eventConfig) {
    const event = {
      id: this.eventIdCounter++,
      type: eventConfig.type,
      triggerTime: eventConfig.time * 1000,     // Конвертируем в мс
      duration: eventConfig.duration * 1000,    // Конвертируем в мс
      position: eventConfig.position || null,
      activated: false,
      endTime: 0
    };
    
    this.eventQueue.push(event);
    
    // Сортируем очередь по времени активации
    this.eventQueue.sort((a, b) => a.triggerTime - b.triggerTime);
  }

  /**
   * Обновление системы событий
   * @param {number} deltaTime - Время с последнего кадра (мс)
   * @param {number} gameTime - Общее время игры (мс)
   */
  update(deltaTime, gameTime) {
    // Проверка очереди событий
    for (let i = this.eventQueue.length - 1; i >= 0; i--) {
      const event = this.eventQueue[i];
      
      if (!event.activated && gameTime >= event.triggerTime) {
        this.activateEvent(event);
        event.activated = true;
        event.endTime = gameTime + event.duration;
      }
    }
    
    // Проверка активных событий
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      const event = this.activeEvents[i];
      
      if (gameTime >= event.endTime) {
        this.deactivateEvent(event);
        this.activeEvents.splice(i, 1);
      } else {
        this.updateActiveEvent(event, deltaTime);
      }
    }
    
    // Очистка выполненных событий из очереди
    this.eventQueue = this.eventQueue.filter(e => !e.activated);
  }

  /**
   * Активация события
   * @param {object} event
   */
  activateEvent(event) {
    this.activeEvents.push(event);
    
    switch (event.type) {
      case 'jammer':
        this.activateJammer(event);
        break;
      case 'storm':
        this.activateStorm(event);
        break;
      case 'overload':
        this.activateOverload(event);
        break;
      case 'surge':
        this.activateSurge(event);
        break;
      case 'raid':
        this.activateRaid(event);
        break;
    }
    
    console.log(`Событие активировано: ${event.type}`);
  }

  /**
   * Деактивация события
   * @param {object} event
   */
  deactivateEvent(event) {
    switch (event.type) {
      case 'jammer':
        this.deactivateJammer(event);
        break;
      case 'storm':
        this.deactivateStorm(event);
        break;
      case 'overload':
        this.deactivateOverload(event);
        break;
      case 'surge':
        this.deactivateSurge(event);
        break;
      case 'raid':
        this.deactivateRaid(event);
        break;
    }
    
    console.log(`Событие завершено: ${event.type}`);
  }

  /**
   * Обновление активного события
   * @param {object} event
   * @param {number} deltaTime
   */
  updateActiveEvent(event, deltaTime) {
    switch (event.type) {
      case 'jammer':
        this.updateJammer(event, deltaTime);
        break;
    }
  }

  // === Типы событий ===

  /**
   * Активация глушилки (зона помех)
   */
  activateJammer(event) {
    if (event.position && this.game.network) {
      this.game.network.jammerZones.push({
        x: event.position.x,
        y: event.position.y,
        radius: event.position.radius || 100
      });
    }
  }

  /**
   * Обновление глушилки
   */
  updateJammer(event, deltaTime) {
    if (this.game.network) {
      this.game.network.updateJammerZones(deltaTime);
    }
  }

  /**
   * Деактивация глушилки
   */
  deactivateJammer(event) {
    if (this.game.network && event.position) {
      this.game.network.jammerZones = this.game.network.jammerZones.filter(
        z => !(z.x === event.position.x && z.y === event.position.y)
      );
    }
  }

  /**
   * Активация бури (отключение части узлов)
   */
  activateStorm(event) {
    if (this.game.network) {
      const nodes = this.game.network.nodes;
      const affectedCount = Math.floor(nodes.length * 0.2);
      
      // Случайным образом выбираем узлы для отключения
      const shuffled = [...nodes].sort(() => 0.5 - Math.random());
      for (let i = 0; i < Math.min(affectedCount, nodes.length); i++) {
        if (shuffled[i].status === 'active') {
          shuffled[i].energy = 0;
        }
      }
    }
  }

  deactivateStorm() {}

  /**
   * Активация перегрузки (скачок нагрузки)
   */
  activateOverload(event) {
    if (this.game.network) {
      for (const node of this.game.network.nodes) {
        node.addLoad(0.5);
      }
    }
  }

  deactivateOverload() {}

  /**
   * Активация притока данных (бонус ресурсов)
   */
  activateSurge(event) {
    if (this.game) {
      this.game.resources.influence += 50;
      this.game.resources.data += 30;
      this.game.ui.updateResources();
    }
  }

  deactivateSurge() {}

  /**
   * Активация рейда (обнаружение stealth-узлов)
   */
  activateRaid(event) {
    if (this.game.network) {
      for (const node of this.game.network.nodes) {
        if (node.type === 'stealth') {
          node.status = 'overloaded';
          node.addLoad(0.8);
        }
      }
    }
  }

  deactivateRaid() {}

  /**
   * Получение списка активных событий для UI
   * @returns {Array}
   */
  getActiveEventsInfo() {
    return this.activeEvents.map(e => ({
      type: e.type,
      remainingTime: Math.max(0, e.endTime - this.game.state.gameTime)
    }));
  }

  /**
   * Очистка всех событий
   */
  clear() {
    this.activeEvents = [];
    this.eventQueue = [];
  }
}
