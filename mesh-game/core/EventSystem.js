/**
 * Система событий игры
 */
export class EventSystem {
  constructor(game) {
    this.game = game;
    this.activeEvents = [];
    this.eventQueue = [];
    this.scheduledEvents = [];
  }

  /**
   * Планирование события
   */
  scheduleEvent(eventConfig) {
    const event = {
      type: eventConfig.type,
      scheduledTime: eventConfig.time || 0,
      duration: eventConfig.duration || 0,
      position: eventConfig.position || null,
      strength: eventConfig.strength || 1,
      startTime: null,
      endTime: null,
      active: false
    };
    
    this.scheduledEvents.push(event);
    return event;
  }

  /**
   * Активация события
   */
  activateEvent(event) {
    event.active = true;
    event.startTime = this.game.state.gameTime;
    event.endTime = event.startTime + event.duration;
    
    switch (event.type) {
      case 'jammer':
        this.activateJammer(event);
        break;
      case 'surge':
        this.activateSurge(event);
        break;
      case 'storm':
        this.activateStorm(event);
        break;
      case 'overload':
        this.activateOverload(event);
        break;
    }
    
    this.activeEvents.push(event);
  }

  /**
   * Активация глушилки
   */
  activateJammer(event) {
    if (event.position) {
      this.game.network.jammerZones.push({
        x: event.position.x,
        y: event.position.y,
        radius: 200,
        strength: event.strength
      });
      
      if (this.game.network) {
        this.game.network.updateConnections();
      }
    }
  }

  /**
   * Деактивация глушилки
   */
  deactivateJammer(event) {
    if (event.position) {
      this.game.network.jammerZones = this.game.network.jammerZones.filter(
        zone => !(
          Math.abs(zone.x - event.position.x) < 1 &&
          Math.abs(zone.y - event.position.y) < 1
        )
      );
      
      if (this.game.network) {
        this.game.network.updateConnections();
      }
    }
  }

  /**
   * Активация скачка нагрузки
   */
  activateSurge(event) {
    // Увеличение трафика в сети
    if (this.game.network) {
      for (const node of this.game.network.nodes) {
        node.load = Math.min(100, node.load + 30);
      }
    }
  }

  /**
   * Активация шторма (отключение узлов)
   */
  activateStorm(event) {
    // Случайное отключение 20% узлов
    if (this.game.network) {
      const nodesToDisable = Math.floor(this.game.network.nodes.length * 0.2);
      for (let i = 0; i < nodesToDisable; i++) {
        const randomIndex = Math.floor(Math.random() * this.game.network.nodes.length);
        this.game.network.nodes[randomIndex].status = 'offline';
      }
      this.game.network.updateConnections();
    }
  }

  /**
   * Активация перегрузки
   */
  activateOverload(event) {
    if (this.game.network) {
      for (const node of this.game.network.nodes) {
        node.load = Math.min(100, node.load + 50);
      }
    }
  }

  /**
   * Обновление системы событий
   */
  update(deltaTime) {
    const currentTime = this.game.state.gameTime;
    
    // Проверка запланированных событий
    for (const event of this.scheduledEvents) {
      if (!event.active && currentTime >= event.scheduledTime) {
        this.activateEvent(event);
      }
    }
    
    // Проверка активных событий на завершение
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      const event = this.activeEvents[i];
      
      if (event.endTime && currentTime >= event.endTime) {
        // Деактивация события
        event.active = false;
        
        switch (event.type) {
          case 'jammer':
            this.deactivateJammer(event);
            break;
          case 'surge':
          case 'overload':
            // Сброс нагрузки
            if (this.game.network) {
              for (const node of this.game.network.nodes) {
                node.load = Math.max(0, node.load - 30);
              }
            }
            break;
          case 'storm':
            // Восстановление узлов
            if (this.game.network) {
              for (const node of this.game.network.nodes) {
                if (node.status === 'offline') {
                  node.status = 'active';
                }
              }
              this.game.network.updateConnections();
            }
            break;
        }
        
        this.activeEvents.splice(i, 1);
      }
    }
  }

  /**
   * Получение активных событий
   */
  getActiveEvents() {
    return [...this.activeEvents];
  }

  /**
   * Серийнаялизация
   */
  toJSON() {
    return {
      scheduledEvents: [...this.scheduledEvents],
      activeEvents: this.activeEvents.map(e => ({ ...e }))
    };
  }

  /**
   * Десериализация
   */
  static fromJSON(data, game) {
    const system = new EventSystem(game);
    system.scheduledEvents = data.scheduledEvents || [];
    system.activeEvents = data.activeEvents || [];
    return system;
  }
}
