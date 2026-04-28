/**
 * Точка входа и UI контроллер
 */
import { GameEngine } from './core/GameEngine.js';
import { CanvasRenderer } from './renderer/CanvasRenderer.js';

// Глобальное состояние
let game = null;
let renderer = null;
let config = null;
let currentMission = null;
let selectedNodeType = null;

// DOM элементы
const elements = {};

/**
 * Инициализация DOM элементов
 */
function initElements() {
  elements.canvas = document.getElementById('gameCanvas');
  
  // Ресурсы
  elements.influence = document.getElementById('influence');
  elements.data = document.getElementById('data');
  elements.influenceIncome = document.getElementById('influence-income');
  elements.dataIncome = document.getElementById('data-income');
  
  // Время
  elements.timer = document.getElementById('timer');
  elements.btnPause = document.getElementById('btn-pause');
  elements.btnSpeed1 = document.getElementById('btn-speed1');
  elements.btnSpeed2 = document.getElementById('btn-speed2');
  elements.btnSpeed5 = document.getElementById('btn-speed5');
  
  // Статистика
  elements.statNodes = document.getElementById('stat-nodes');
  elements.statEdges = document.getElementById('stat-edges');
  
  // Цели
  elements.objCoverageCurrent = document.getElementById('obj-coverage-current');
  elements.objCoverageBar = document.getElementById('obj-coverage-bar');
  elements.objCoverageTarget = document.getElementById('obj-coverage-target');
  elements.objLatencyCurrent = document.getElementById('obj-latency-current');
  elements.objLatencyBar = document.getElementById('obj-latency-bar');
  elements.objLatencyTarget = document.getElementById('obj-latency-target');
  elements.objStabilityCurrent = document.getElementById('obj-stability-current');
  elements.objStabilityBar = document.getElementById('obj-stability-bar');
  elements.objStabilityTarget = document.getElementById('obj-stability-target');
  elements.objNodesCurrent = document.getElementById('obj-nodes-current');
  elements.objNodesBar = document.getElementById('obj-nodes-bar');
  elements.objNodesTarget = document.getElementById('obj-nodes-target');
  
  // Миссия
  elements.missionName = document.getElementById('mission-name');
  elements.missionDesc = document.getElementById('mission-desc');
  
  // Кнопки узлов
  elements.nodeButtons = document.querySelectorAll('.add-node-btn');
  
  // Выбранный узел
  elements.selectedNodeInfo = document.getElementById('selected-node-info');
  elements.nodeDetails = document.getElementById('node-details');
  elements.btnRemoveNode = document.getElementById('btn-remove-node');
  
  // Нижняя панель
  elements.btnSave = document.getElementById('btn-save');
  elements.btnLoad = document.getElementById('btn-load');
  elements.btnReset = document.getElementById('btn-reset');
  elements.btnViewDefault = document.getElementById('btn-view-default');
  elements.btnViewCoverage = document.getElementById('btn-view-coverage');
  elements.btnViewLoad = document.getElementById('btn-view-load');
  
  // Модальные окна
  elements.modalTutorial = document.getElementById('modal-tutorial');
  elements.tutorialText = document.getElementById('tutorial-text');
  elements.btnStartGame = document.getElementById('btn-start-game');
  elements.modalResult = document.getElementById('modal-result');
  elements.resultTitle = document.getElementById('result-title');
  elements.resultStats = document.getElementById('result-stats');
  elements.btnContinue = document.getElementById('btn-continue');
  elements.btnRestart = document.getElementById('btn-restart');
  
  // Тултип
  elements.tooltip = document.getElementById('tooltip');
}

/**
 * Загрузка конфигурации
 */
async function loadConfig() {
  const response = await fetch('data/config.json');
  return await response.json();
}

/**
 * Загрузка миссии
 */
async function loadMission(missionId = 'mission1') {
  const response = await fetch('data/scenarios.json');
  const scenarios = await response.json();
  return scenarios[missionId];
}

/**
 * Обновление UI ресурсов
 */
function updateResources(data) {
  elements.influence.textContent = Math.floor(data.resources.energy);
  elements.data.textContent = Math.floor(data.resources.info);
  const income = data.income || {};
  elements.influenceIncome.textContent = `+${(income.energy || 0).toFixed(1)}/сек`;
  elements.dataIncome.textContent = `+${(income.info || 0).toFixed(1)}/сек`;
}

/**
 * Обновление UI метрик
 */
function updateMetrics(metrics) {
  const network = game.state.network;
  
  // Статистика - считаем только узлы игрока (не static и не hub)
  const playerNodes = network.nodes.filter(n => 
    !n.isStatic && n.type !== 'hub'
  );
  elements.statNodes.textContent = playerNodes.length;
  elements.statEdges.textContent = network.edges.length;
  
  // Цели
  const objectives = currentMission.objectives;
  
  // Покрытие
  const coveragePercent = Math.min(100, (metrics.coverage / (objectives.coverage || 100)) * 100);
  elements.objCoverageCurrent.textContent = `${metrics.coverage.toFixed(1)}%`;
  elements.objCoverageBar.style.width = `${coveragePercent}%`;
  elements.objCoverageTarget.textContent = `${objectives.coverage || 0}%`;
  
  // Задержка
  const latencyPercent = objectives.maxLatency 
    ? Math.min(100, (1 - metrics.avgLatency / objectives.maxLatency) * 100)
    : 100;
  elements.objLatencyCurrent.textContent = `${metrics.avgLatency.toFixed(0)}ms`;
  elements.objLatencyBar.style.width = `${Math.max(0, latencyPercent)}%`;
  elements.objLatencyTarget.textContent = `${objectives.maxLatency || 0}ms`;
  
  // Стабильность
  const stabilityPercent = Math.min(100, (metrics.stability / (objectives.minStability || 100)) * 100);
  elements.objStabilityCurrent.textContent = `${metrics.stability.toFixed(1)}%`;
  elements.objStabilityBar.style.width = `${stabilityPercent}%`;
  elements.objStabilityTarget.textContent = `${objectives.minStability || 0}%`;
  
  // Узлы (цель по количеству узлов игрока)
  const nodesPercent = objectives.nodeCount
    ? Math.min(100, (playerNodes.length / objectives.nodeCount) * 100)
    : 100;
  elements.objNodesCurrent.textContent = playerNodes.length;
  elements.objNodesBar.style.width = `${nodesPercent}%`;
  elements.objNodesTarget.textContent = objectives.nodeCount || 0;
  
  // Время
  const minutes = Math.floor(game.state.gameTime / 60);
  const seconds = Math.floor(game.state.gameTime % 60);
  elements.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Обновление информации о выбранном узле
 */
function updateSelectedNodeInfo(node) {
  if (!node) {
    elements.selectedNodeInfo.classList.add('hidden');
    return;
  }
  
  elements.selectedNodeInfo.classList.remove('hidden');
  
  const nodeConfig = config.nodeTypes[node.type];
  
  // Защита от отсутствующей конфигурации узла
  if (!nodeConfig) {
    console.warn('Конфигурация узла не найдена для типа:', node.type);
    elements.selectedNodeInfo.classList.add('hidden');
    return;
  }
  
  // Нельзя удалять статические узлы (home, router) и хаб
  const canRemove = !nodeConfig.isStatic && !nodeConfig.isHub;
  
  const typeName = nodeConfig.name;
  const energyCost = nodeConfig.energyCost || 0;
  const throughput = nodeConfig.throughput || 0;
  
  elements.nodeDetails.innerHTML = `
    <strong>${typeName}</strong><br>
    Тип: ${node.type}<br>
    Статус: ${node.status}<br>
    Радиус: ${node.radius}м<br>
    Нагрузка: ${node.load.toFixed(1)}%<br>
    Потребление: ${energyCost} Э/сек<br>
    Пропускная способность: ${throughput} инф/сек<br>
    Связей: ${node.connections.length}
  `;
  
  // Показываем кнопку удаления только если узел можно удалить
  if (canRemove) {
    elements.btnRemoveNode.classList.remove('hidden');
  } else {
    elements.btnRemoveNode.classList.add('hidden');
  }
}

/**
 * Показать тултип
 */
function showTooltip(text, x, y) {
  elements.tooltip.textContent = text;
  elements.tooltip.classList.remove('hidden');
  elements.tooltip.style.left = `${x + 15}px`;
  elements.tooltip.style.top = `${y + 15}px`;
}

/**
 * Скрыть тултип
 */
function hideTooltip() {
  elements.tooltip.classList.add('hidden');
}

/**
 * Показать модальное окно обучения
 */
function showTutorial(mission) {
  if (!mission.tutorial || mission.tutorial.length === 0) {
    elements.modalTutorial.classList.add('hidden');
    return;
  }
  
  const tutorialHtml = mission.tutorial.map(line => `<p>${line}</p>`).join('');
  elements.tutorialText.innerHTML = tutorialHtml;
  elements.modalTutorial.classList.remove('hidden');
}

/**
 * Показать результат миссии
 */
function showResult(completed, metrics) {
  elements.resultTitle.textContent = completed ? '🎉 Победа!' : '❌ Поражение';
  elements.resultTitle.style.color = completed ? '#00ff88' : '#ff4444';
  
  elements.resultStats.innerHTML = `
    <p>Покрытие: ${metrics.coverage.toFixed(1)}%</p>
    <p>Задержка: ${metrics.avgLatency.toFixed(0)}ms</p>
    <p>Стабильность: ${metrics.stability.toFixed(1)}%</p>
    <p>Узлов: ${game.state.network.nodes.length}</p>
  `;
  
  elements.modalResult.classList.remove('hidden');
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
  // Выбор типа узла
  elements.nodeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Сброс предыдущего выбора
      elements.nodeButtons.forEach(b => b.classList.remove('selected'));
      
      // Если уже выбран этот тип - отмена
      if (selectedNodeType === btn.dataset.type) {
        selectedNodeType = null;
        game.pendingNodeType = null;
      } else {
        btn.classList.add('selected');
        selectedNodeType = btn.dataset.type;
        game.pendingNodeType = btn.dataset.type;
      }
    });
    
    // Тултип при наведении
    btn.addEventListener('mouseenter', (e) => {
      if (btn.title) {
        showTooltip(btn.title, e.clientX, e.clientY);
      }
    });
    
    btn.addEventListener('mouseleave', hideTooltip);
  });
  
  // Управление временем
  elements.btnPause.addEventListener('click', () => {
    game.setPaused(!game.state.isPaused);
    elements.btnPause.textContent = game.state.isPaused ? '▶' : '⏸';
  });
  
  elements.btnSpeed1.addEventListener('click', () => {
    game.setTimeScale(1);
    updateTimeSpeedButtons(elements.btnSpeed1);
  });
  
  elements.btnSpeed2.addEventListener('click', () => {
    game.setTimeScale(2);
    updateTimeSpeedButtons(elements.btnSpeed2);
  });
  
  elements.btnSpeed5.addEventListener('click', () => {
    game.setTimeScale(5);
    updateTimeSpeedButtons(elements.btnSpeed5);
  });
  
  // Управление видом
  elements.btnViewDefault.addEventListener('click', () => {
    renderer.setViewMode('default');
    updateViewButtons(elements.btnViewDefault);
  });
  
  elements.btnViewCoverage.addEventListener('click', () => {
    renderer.setViewMode('coverage');
    updateViewButtons(elements.btnViewCoverage);
  });
  
  elements.btnViewLoad.addEventListener('click', () => {
    renderer.setViewMode('load');
    updateViewButtons(elements.btnViewLoad);
  });
  
  // Сохранение/загрузка
  elements.btnSave.addEventListener('click', () => {
    game.save();
    alert('Игра сохранена!');
  });
  
  elements.btnLoad.addEventListener('click', async () => {
    const loaded = await game.load();
    if (loaded) {
      alert('Игра загружена!');
    } else {
      alert('Нет сохраненных данных');
    }
  });
  
  elements.btnReset.addEventListener('click', () => {
    if (confirm('Сбросить прогресс и начать заново?')) {
      game.reset();
    }
  });
  
  // Удаление узла
  elements.btnRemoveNode.addEventListener('click', () => {
    if (game.state.selectedNode) {
      game.removeNode(game.state.selectedNode.id);
      game.state.selectedNode = null;
      updateSelectedNodeInfo(null);
    }
  });
  
  // Модальные окна
  elements.btnStartGame.addEventListener('click', () => {
    elements.modalTutorial.classList.add('hidden');
  });
  
  elements.btnContinue.addEventListener('click', () => {
    elements.modalResult.classList.add('hidden');
  });
  
  elements.btnRestart.addEventListener('click', () => {
    game.reset();
  });
  
  // Движение мыши для тултипа
  document.addEventListener('mousemove', (e) => {
    if (!elements.tooltip.classList.contains('hidden')) {
      elements.tooltip.style.left = `${e.clientX + 15}px`;
      elements.tooltip.style.top = `${e.clientY + 15}px`;
    }
  });
}

/**
 * Обновление кнопок скорости
 */
function updateTimeSpeedButtons(activeBtn) {
  [elements.btnSpeed1, elements.btnSpeed2, elements.btnSpeed5].forEach(btn => {
    btn.classList.toggle('active', btn === activeBtn);
  });
}

/**
 * Обновление кнопок вида
 */
function updateViewButtons(activeBtn) {
  [elements.btnViewDefault, elements.btnViewCoverage, elements.btnViewLoad].forEach(btn => {
    btn.classList.toggle('active', btn === activeBtn);
  });
}

/**
 * Основная функция запуска
 */
async function main() {
  initElements();
  
  // Загрузка конфигурации
  config = await loadConfig();
  
  // Загрузка миссии
  currentMission = await loadMission('mission1');
  
  // Создание игры
  game = new GameEngine(elements.canvas);
  
  // Создание рендерера
  renderer = new CanvasRenderer(elements.canvas, game);
  
  // Настройка callbacks
  game.onResourceUpdate = updateResources;
  game.onMetricsUpdate = updateMetrics;
  game.onMissionComplete = (metrics) => showResult(true, metrics);
  game.onMissionFail = (metrics) => showResult(false, metrics);
  
  // Callbacks рендерера
  renderer.onNodeSelect = updateSelectedNodeInfo;
  renderer.onNodeAdded = () => {
    selectedNodeType = null;
    game.pendingNodeType = null;
    elements.nodeButtons.forEach(b => b.classList.remove('selected'));
  };
  
  // Инициализация игры
  await game.init(currentMission, config);
  
  // Настройка обработчиков
  setupEventListeners();
  
  // Запуск игрового цикла
  requestAnimationFrame((t) => game.loop(t));
  
  console.log('WeaveNet запущен!');
}

// Запуск после загрузки DOM
window.addEventListener('DOMContentLoaded', main);
