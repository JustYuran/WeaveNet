/**
 * NetworkManager - Менеджер сетевых подключений и топологии
 * [ЧТО] Управляет логикой соединения построек и пользователей в сеть
 * [ЗАЧЕМ] 4.1-4.4 - Логика соединения, топология, маршрутизация
 * [PLAN] 4.1 - Радиус и дальность сигнала, 4.4 - Построение графа сети
 * 
 * [МОДУЛЬ 4] Связь и Топология
 * - Постройки соединяются в сеть, образуя граф
 * - Пользователи подключаются к ближайшей постройке
 * - Изолированные фрагменты сети теряют доход
 */

class NetworkManager {
    /**
     * Конструктор менеджера сети
     * @param {object} hexGrid - Сетка гексов
     * @param {object} buildingSystem - Система построек
     * @param {object} userManager - Менеджер пользователей
     */
    constructor(hexGrid, buildingSystem, userManager) {
        // [ЧТО] Ссылки на другие системы
        // [ЗАЧЕМ] Доступ к построкам, гексам и пользователям
        this.hexGrid = hexGrid;
        this.buildingSystem = buildingSystem;
        this.userManager = userManager;
        
        // [ЧТО] Граф сети (вершины = гексы с объектами, рёбра = связи)
        // [ЗАЧЕМ] 4.4.1 - Построение графа сети
        this.networkGraph = {
            nodes: new Map(),      // hexId -> node info
            edges: new Map(),      // "from,to" -> edge info
            components: []         // Связные компоненты
        };
        
        // [ЧТО] Соединения между постройками
        // [ЗАЧЕМ] 4.1 - Отслеживание активных соединений
        this.buildingConnections = new Map();  // "buildingId1,buildingId2" -> connection
        
        // [ЧТО] Соединения пользователей с сетью
        // [ЗАЧЕМ] 4.2 - Отслеживание подключений пользователей
        this.userConnections = new Map();  // userId -> connectedBuildingId
        
        // [ЧТО] Изолированные группы
        // [ЗАЧЕМ] 4.4.3 - Отслеживание фрагментированной сети
        this.isolatedFragments = [];
        
        console.log('[NetworkManager] Инициализирован менеджер сети');
    }
    
    /**
     * Перестроение графа сети
     * [ЧТО] Пересчитывает граф на основе текущих построек
     * [ЗАЧЕМ] 4.4.1 - Граф пересчитывается при любом изменении
     */
    rebuildNetwork() {
        // [ЧТО] Очищаем старый граф
        // [ЗАЧЕМ] Начинаем с чистого листа
        this.networkGraph.nodes.clear();
        this.networkGraph.edges.clear();
        this.buildingConnections.clear();
        this.isolatedFragments = [];
        
        // [ЧТО] Получаем все активные постройки
        // [ЗАЧЕМ] Вершины графа
        const buildings = this.buildingSystem.getAllBuildings();
        
        if (buildings.length === 0) {
            console.log('[NetworkManager] Сеть пуста (нет построек)');
            return;
        }
        
        // [ЧТО] Создаём вершины графа (один для каждой постройки)
        // [ЗАЧЕМ] 4.4.1 - Построение графа сети
        buildings.forEach(building => {
            // Находим гекс где находится постройка
            const hexes = this.hexGrid.getAllHexes();
            const hex = hexes.find(h => h.building && h.building.id === building.id);
            
            if (hex) {
                this.networkGraph.nodes.set(hex.id, {
                    hexId: hex.id,
                    buildingId: building.id,
                    buildingType: building.typeId,
                    mode: building.mode,
                    isActive: building.isActive
                });
            }
        });
        
        // [ЧТО] Создаём рёбра графа (соединения между постройками)
        // [ЗАЧЕМ] 4.1 - Логика соединения построек
        this.buildConnections();
        
        // [ЧТО] Находим связные компоненты
        // [ЗАЧЕМ] 4.4.3 - Определение изолированных фрагментов
        this.findConnectedComponents();
        
        // [ЧТО] Подключаем пользователей к сети
        // [ЗАЧЕМ] 4.2 - Механика подключения пользователей
        this.connectUsers();
        
        console.log(`[NetworkManager] Сеть перестроена. Узлов: ${this.networkGraph.nodes.size}, связей: ${this.networkGraph.edges.size}`);
    }
    
    /**
     * Создание соединений между постройками
     * [ЧТО] Рассчитывает какие постройки видят друг друга
     * [ЗАЧЕМ] 4.1 - Радиус и соединения
     */
    buildConnections() {
        // [ЧТО] Проходим по всем парам постройек
        // [ЗАЧЕМ] Проверяем могут ли они соединиться
        
        const nodes = Array.from(this.networkGraph.nodes.values());
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const node1 = nodes[i];
                const node2 = nodes[j];
                
                // [ЧТО] Получаем постройки и гексы
                // [ЗАЧЕМ] Проверка расстояния и видимости
                const hex1 = this.hexGrid.getHexById(node1.hexId);
                const hex2 = this.hexGrid.getHexById(node2.hexId);
                
                if (!hex1 || !hex2) continue;
                
                // [ЧТО] Проверяем расстояние между гексами
                // [ЗАЧЕМ] 4.1.1 - Радиус покрытия определяет соединение
                const distance = this.hexDistance(hex1, hex2);
                
                // [ЧТО] Первая постройка должна быть активна или в Жёлтом режиме
                // [ЗАЧЕМ] 4.1.3 - Иерархия и приоритеты связей
                const building1 = this.buildingSystem.getBuildingOnHex(node1.hexId);
                const building2 = this.buildingSystem.getBuildingOnHex(node2.hexId);
                
                if (!building1 || !building2) continue;
                if (building1.mode === 'white' || building2.mode === 'white') continue;
                
                // [ЧТО] Проверяем радиусы
                // [ЗАЧЕМ] 4.1.1 - Соединение если расстояние ≤ радиусу
                const radius1 = building1.currentRadius;
                const radius2 = building2.currentRadius;
                
                if (distance <= Math.max(radius1, radius2)) {
                    // [ЧТО] Проверяем видимость (преграды не блокируют полностью)
                    // [ЗАЧЕМ] 4.1.2 - Влияние ландшафта на сигнал
                    if (this.buildingSystem.canSignalPass(hex1, hex2, this.hexGrid)) {
                        // [ЧТО] Создаём соединение
                        // [ЗАЧЕМ] 4.3 - Визуализация сетевых линий
                        const edgeKey = `${node1.hexId},${node2.hexId}`;
                        this.networkGraph.edges.set(edgeKey, {
                            from: node1.hexId,
                            to: node2.hexId,
                            distance: distance,
                            isActive: true
                        });
                    }
                }
            }
        }
    }
    
    /**
     * Расчёт расстояния между двумя гексами (количество шагов)
     * [ЧТО] Вычисляет расстояние в гексах
     * [ЗАЧЕМ] 4.1.1 - Определение радиуса действия
     * @param {object} hex1 - Первый гекс
     * @param {object} hex2 - Второй гекс
     * @returns {number} Расстояние в гексах
     */
    hexDistance(hex1, hex2) {
        // [ЧТО] Используем формулу для axial-координат
        // [ЗАЧЕМ] Расстояние = (|q1-q2| + |r1-r2| + |s1-s2|) / 2
        // где s = -q - r
        
        const dq = Math.abs(hex1.q - hex2.q);
        const dr = Math.abs(hex1.r - hex2.r);
        const ds = Math.abs((-hex1.q - hex1.r) - (-hex2.q - hex2.r));
        
        return (dq + dr + ds) / 2;
    }
    
    /**
     * Поиск связных компонент (изолированные фрагменты сети)
     * [ЧТО] Находит все связные компоненты графа
     * [ЗАЧЕМ] 4.4.3 - Определение изолированных групп
     */
    findConnectedComponents() {
        const visited = new Set();
        this.networkGraph.components = [];
        
        // [ЧТО] DFS для каждого необошедшего узла
        // [ЗАЧЕМ] Нахождение всех компонент
        this.networkGraph.nodes.forEach((node, nodeId) => {
            if (!visited.has(nodeId)) {
                const component = [];
                this.dfsComponent(nodeId, visited, component);
                this.networkGraph.components.push(component);
            }
        });
        
        // [ЧТО] Логируем изолированные фрагменты
        // [ЗАЧЕМ] Отладка и статистика
        this.networkGraph.components.forEach((component, i) => {
            if (component.length === 1) {
                console.log(`[NetworkManager] Найден изолированный узел: гекс ${component[0]}`);
            }
        });
    }
    
    /**
     * DFS для поиска компонент
     * [ЧТО] Рекурсивный поиск в глубину
     * [ЗАЧЕМ] Построение связной компоненты
     */
    dfsComponent(nodeId, visited, component) {
        visited.add(nodeId);
        component.push(nodeId);
        
        // [ЧТО] Проходим по всем соседним узлам
        // [ЗАЧЕМ] Построение компоненты
        this.networkGraph.edges.forEach((edge) => {
            if (edge.from === nodeId && !visited.has(edge.to)) {
                this.dfsComponent(edge.to, visited, component);
            } else if (edge.to === nodeId && !visited.has(edge.from)) {
                this.dfsComponent(edge.from, visited, component);
            }
        });
    }
    
    /**
     * Подключение пользователей к ближайшей постройке
     * [ЧТО] Определяет какие пользователи подключены к какой постройке
     * [ЗАЧЕМ] 4.2 - Механика подключения пользователей
     */
    connectUsers() {
        this.userConnections.clear();
        
        // [ЧТО] Для каждого пользователя находим ближайшую активную постройку
        // [ЗАЧЕМ] 4.2.1 - Определение подключённого пользователя
        this.userManager.getAllUsers().forEach(user => {
            const userHex = this.hexGrid.getHexById(user.hexId);
            if (!userHex) return;
            
            // [ЧТО] Ищем ближайшую постройку в радиусе
            // [ЗАЧЕМ] 4.2.1 - Заражение пользователя
            let closestBuilding = null;
            let closestDistance = Infinity;
            
            const buildings = this.buildingSystem.getAllBuildings();
            buildings.forEach(building => {
                const buildingHex = this.hexGrid.getAllHexes().find(h => 
                    h.building && h.building.id === building.id
                );
                
                if (!buildingHex || building.mode === 'white') return;
                
                const distance = this.hexDistance(userHex, buildingHex);
                if (distance <= building.currentRadius && distance < closestDistance) {
                    closestBuilding = building.id;
                    closestDistance = distance;
                }
            });
            
            if (closestBuilding) {
                this.userConnections.set(user.id, closestBuilding);
                
                // [ЧТО] Заражаем пользователя если был Белым
                // [ЗАЧЕМ] 4.2.1 - Белый → Желтый
                if (user.status === 'white') {
                    user.status = 'yellow';
                }
            }
        });
    }
    
    /**
     * Получение всех узлов сети
     * @returns {array} Массив узлов
     */
    getNetworkNodes() {
        return Array.from(this.networkGraph.nodes.values());
    }
    
    /**
     * Получение всех рёбер сети
     * @returns {array} Массив рёбер
     */
    getNetworkEdges() {
        return Array.from(this.networkGraph.edges.values());
    }
    
    /**
     * Получение информации о сети
     * @returns {object} Статистика сети
     */
    getNetworkStats() {
        return {
            nodeCount: this.networkGraph.nodes.size,
            edgeCount: this.networkGraph.edges.size,
            componentCount: this.networkGraph.components.length,
            largestComponent: Math.max(...this.networkGraph.components.map(c => c.length), 0),
            userCount: this.userConnections.size
        };
    }
}

// [ЧТО] Экспорт класса
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkManager;
}
