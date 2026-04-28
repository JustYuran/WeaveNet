/**
 * WeaveNet - Mesh Network Strategy Game
 * Точка входа приложения
 */
import { GameEngine } from './core/GameEngine.js';

/**
 * UI контроллер - управляет HTML элементами интерфейса
 */
class UIController {
  constructor(game) {
    this.game = game;
    this.selectedNodeType = 'basic';
    
    this.initEventListeners();
  }

  /**
   * Инициализация обработчиков событий
   */
  initEventListeners() {
    // Кнопки управления временем
    document.getElementById('pause-btn').addEventListener('click', () => {
      this.game.togglePause();
      this.updatePauseButton();
    });

    document.getElementById('speed1-btn').addEventListener('click', () => {
      this.game.setTimeSpeed(1);
      this.updateSpeedButtons(1);
    });

    document.getElementById('speed2-btn').addEventListener('click', () => {
      this.game.setTimeSpeed(2);
      this.updateSpeedButtons(2);
    });

    document.getElementById('speed5-btn').addEventListener('click', () => {
      this.game.setTimeSpeed(5);
      this.updateSpeedButtons(5);
    });

    // Кнопки добавления узлов
    document.querySelectorAll('.add-node-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.type;
        this.selectNodeType(type);
      });
    });

    // Клик по canvas - добавление узла
    const canvas = document.getElementById('gameCanvas');
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.game.addNode(x, y, this.selectedNodeType);
    });

    // Hover на узлы
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const node = this.game.renderer.getNodeAt(mouseX, mouseY);
      
      // Сброс hover у всех узлов
      this.game.state.network.nodes.forEach(n => n.hovered = false);
      
      if (node) {
        node.hovered = true;
        this.showTooltip(e.clientX, e.clientY, node);
      } else {
        this.hideTooltip();
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });

    // Режимы просмотра
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.setViewMode(mode);
      });
    });

    // Кнопки управления
    document.getElementById('save-btn').addEventListener('click', () => {
      this.game.save();
      alert('Игра сохранена!');
    });

    document.getElementById('load-btn').addEventListener('click', () => {
      const saveData = localStorage.getItem('weavenet_save');
      if (saveData) {
        this.game.load(saveData);
      } else {
        alert('Нет сохраненных данных');
      }
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Сбросить прогресс и начать заново?')) {
        this.game.reset();
      }
    });

    // Модальное окно
    document.getElementById('modal-close-btn').addEventListener('click', () => {
      document.getElementById('modal-overlay').classList.add('hidden');
    });
  }

  /**
   * Выбор типа узла для размещения
   * @param {string} type
   */
  selectNodeType(type) {
    this.selectedNodeType = type;
    
    // Обновление визуального выделения кнопок
    document.querySelectorAll('.add-node-btn').forEach(btn => {
      btn.classList.remove('selected');
      if (btn.dataset.type === type) {
        btn.classList.add('selected');
      }
    });
  }

  /**
   * Обновление кнопки паузы
   */
  updatePauseButton() {
    const btn = document.getElementById('pause-btn');
    btn.textContent = this.game.state.isPaused ? '▶' : '⏸';
  }

  /**
   * Обновление кнопок скорости
   * @param {number} speed
   */
  updateSpeedButtons(speed) {
    document.querySelectorAll('#time-controls button[id^="speed"]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`speed${speed}-btn`).classList.add('active');
  }

  /**
   * Обновление отображения ресурсов
   */
  updateResources() {
    document.getElementById('influence').textContent = 
      Math.floor(this.game.state.resources.influence);
    document.getElementById('data').textContent = 
      Math.floor(this.game.state.resources.data);
  }

  /**
   * Обновление статистики
   */
  updateStats() {
    const metrics = this.game.state.network.getMetrics();
    
    document.getElementById('stat-nodes').textContent = metrics.totalNodes;
    document.getElementById('stat-edges').textContent = metrics.totalEdges;
    document.getElementById('stat-coverage').textContent = 
      Math.round(metrics.coverage) + '%';
    document.getElementById('stat-latency').textContent = 
      metrics.avgLatency + 'ms';
    document.getElementById('stat-packets').textContent = metrics.activePackets;
    document.getElementById('stat-stability').textContent = 
      metrics.stability + '%';
  }

  /**
   * Обновление таймера миссии
   * @param {number} gameTime - Время в мс
   */
  updateTimer(gameTime) {
    const seconds = Math.floor(gameTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    document.getElementById('timer').textContent = 
      `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Обновление целей миссии
   */
  updateObjectives() {
    const mission = this.game.state.currentMission;
    if (!mission) return;
    
    const objectives = mission.objectives;
    const metrics = this.game.state.network.getMetrics();
    
    // Покрытие
    if (objectives.coverage) {
      document.getElementById('obj-coverage-target').textContent = objectives.coverage + '%';
      document.getElementById('obj-coverage-val').textContent = Math.round(metrics.coverage) + '%';
      document.getElementById('obj-coverage-fill').style.width = 
        Math.min(100, (metrics.coverage / objectives.coverage) * 100) + '%';
    }
    
    // Задержка
    if (objectives.maxLatency) {
      document.getElementById('obj-latency-target').textContent = objectives.maxLatency + 'ms';
      document.getElementById('obj-latency-val').textContent = metrics.avgLatency + 'ms';
      // Для задержки: чем меньше, тем лучше
      const latencyProgress = Math.max(0, 100 - (metrics.avgLatency / objectives.maxLatency) * 100);
      document.getElementById('obj-latency-fill').style.width = latencyProgress + '%';
    }
    
    // Стабильность
    if (objectives.minStability) {
      document.getElementById('obj-stability-target').textContent = objectives.minStability + '%';
      document.getElementById('obj-stability-val').textContent = metrics.stability + '%';
      document.getElementById('obj-stability-fill').style.width = 
        Math.min(100, (metrics.stability / objectives.minStability) * 100) + '%';
    }
  }

  /**
   * Установка режима просмотра
   * @param {string} mode
   */
  setViewMode(mode) {
    this.game.renderer.setViewMode(mode);
    
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      }
    });
  }

  /**
   * Показ тултипа для узла
   * @param {number} x
   * @param {number} y
   * @param {Node} node
   */
  showTooltip(x, y, node) {
    const tooltip = document.getElementById('tooltip');
    const typeConfig = this.game.config.nodeTypes[node.type];
    
    tooltip.innerHTML = `
      <h4>${typeConfig.icon} ${typeConfig.name} Узел</h4>
      <div class="stat"><span>Статус:</span> <span>${this.getStatusText(node.status)}</span></div>
      <div class="stat"><span>Радиус:</span> <span>${node.getEffectiveRadius()}</span></div>
      <div class="stat"><span>Емкость:</span> <span>${node.getEffectiveCapacity()} Mbps</span></div>
      <div class="stat"><span>Нагрузка:</span> <span>${Math.round(node.load * 100)}%</span></div>
      <div class="stat"><span>Энергия:</span> <span>${Math.round(node.energy)}%</span></div>
      <div class="stat"><span>Связей:</span> <span>${node.connections.length}</span></div>
    `;
    
    tooltip.style.display = 'block';
    tooltip.style.left = (x + 15) + 'px';
    tooltip.style.top = (y + 15) + 'px';
  }

  /**
   * Скрытие тултипа
   */
  hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
  }

  /**
   * Получение текста статуса
   * @param {string} status
   * @returns {string}
   */
  getStatusText(status) {
    const texts = {
      'active': '🟢 Активен',
      'overloaded': '🟠 Перегружен',
      'offline': '🔴 Отключен'
    };
    return texts[status] || status;
  }

  /**
   * Показ сообщения о завершении миссии
   * @param {boolean} success
   */
  showMissionComplete(success) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const message = document.getElementById('modal-message');
    
    if (success) {
      title.textContent = '🎉 Миссия завершена!';
      title.style.color = '#00ff88';
      message.textContent = 'Все цели достигнуты. Отличная работа!';
    } else {
      title.textContent = '❌ Миссия провалена';
      title.style.color = '#ff4444';
      message.textContent = 'Время вышло. Попробуйте снова!';
    }
    
    modal.classList.remove('hidden');
  }
}

/**
 * Основная функция запуска игры
 */
async function main() {
  console.log('WeaveNet - Mesh Network Game');
  console.log('Запуск игры...');
  
  // Загрузка конфигурации
  const configResponse = await fetch('data/config.json');
  const config = await configResponse.json();
  
  // Загрузка сценариев
  const scenariosResponse = await fetch('data/scenarios.json');
  const scenarios = await scenariosResponse.json();
  
  // Создание canvas и игры
  const canvas = document.getElementById('gameCanvas');
  const game = new GameEngine(canvas);
  
  // Создание UI контроллера
  const ui = new UIController(game);
  game.setUI(ui);
  
  // Попытка загрузки сохранения
  const savedGame = localStorage.getItem('weavenet_save');
  
  if (savedGame) {
    try {
      const saveData = JSON.parse(savedGame);
      // Если есть сохранение, загружаем его
      await game.load(savedGame);
      console.log('Сохранение загружено');
    } catch (e) {
      console.log('Ошибка загрузки сохранения, начинаем новую игру');
    }
  }
  
  // Если нет сохранения или ошибка, начинаем первую миссию
  if (!game.state.network) {
    await game.init(scenarios.mission1, config);
    console.log('Новая игра: Миссия 1');
  }
  
  // Запуск игрового цикла
  game.loop();
  
  console.log('Игра запущена!');
}

// Запуск после загрузки DOM
window.addEventListener('DOMContentLoaded', main);
