class MinecraftBotDashboard {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.maxReconnectAttempts = 10;
        this.reconnectAttempts = 0;
        this.chatMessages = [];
        this.maxChatMessages = 50;
        
        this.connect();
        this.setupEventListeners();
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleDisconnection();
        }
    }

    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            console.log('Connected to bot dashboard');
            this.updateConnectionStatus(true);
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from bot dashboard');
            this.handleDisconnection();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleDisconnection();
        };
    }

    handleMessage(message) {
        switch (message.type) {
            case 'connected':
            case 'update':
                this.updateBotStatus(message.data);
                break;
            case 'chat':
                this.addChatMessage(message.data);
                break;
            case 'inventory':
                this.updateInventory(message.data);
                break;
            case 'stats':
                this.updateStats(message.data);
                break;
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const statusIcon = statusElement.querySelector('i');
        const statusText = statusElement.querySelector('span');

        if (connected) {
            statusElement.className = 'status-badge online';
            statusText.textContent = 'Connected';
        } else {
            statusElement.className = 'status-badge offline';
            statusText.textContent = this.reconnectAttempts > 0 ? 
                `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})` : 
                'Disconnected';
        }
    }

    updateBotStatus(data) {
        document.getElementById('health').textContent = `${data.health}/20`;
        document.getElementById('food').textContent = `${data.food}/20`;
        document.getElementById('position').textContent = 
            `${data.position.x} ${data.position.y} ${data.position.z}`;
        document.getElementById('weather').textContent = data.weather;

        this.updateSystemStatus('autoEat', data.systems.autoEat);
        this.updateSystemStatus('combat', data.systems.combat);
        this.updateSystemStatus('farming', data.systems.farming);
        this.updateSystemStatus('fishing', data.systems.fishing);
    }

    updateSystemStatus(systemId, active) {
        const element = document.getElementById(systemId);
        element.textContent = active ? 'ON' : 'OFF';
        element.className = `system-status ${active ? 'active' : 'inactive'}`;
    }

    updateInventory(data) {
        const inventoryInfo = document.getElementById('inventoryInfo');
        const inventoryGrid = document.getElementById('inventoryGrid');

        inventoryInfo.textContent = `${data.usedSlots}/${data.totalSlots} slots`;
        
        inventoryGrid.innerHTML = '';
        
        for (let i = 0; i < data.totalSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            
            const item = data.items.find(item => item.slot === i);
            if (item) {
                slot.classList.add('filled');
                slot.textContent = item.count > 1 ? item.count : '';
                slot.title = `${item.name} x${item.count}`;
            }
            
            inventoryGrid.appendChild(slot);
        }
    }

    updateStats(data) {
        document.getElementById('uptime').textContent = this.formatUptime(data.uptime);
        document.getElementById('blocksMinedTotal').textContent = data.blocksMinedTotal || 0;
        document.getElementById('distanceTraveled').textContent = data.distanceTraveled || 0;
        document.getElementById('combatKills').textContent = data.combatKills || 0;
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    addChatMessage(messageData) {
        const chatContainer = document.getElementById('chatLog');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        const timestamp = new Date().toLocaleTimeString();
        messageElement.innerHTML = `
            <span class="chat-timestamp">${timestamp}</span>
            ${messageData.message || messageData}
        `;
        
        chatContainer.appendChild(messageElement);
        
        this.chatMessages.push(messageElement);
        if (this.chatMessages.length > this.maxChatMessages) {
            const oldMessage = this.chatMessages.shift();
            oldMessage.remove();
        }
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    sendCommand(command) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'command',
                command: command
            }));
            
            this.addChatMessage(`> ${command}`);
        } else {
            this.addChatMessage('Error: Not connected to bot');
        }
    }

    handleDisconnection() {
        this.updateConnectionStatus(false);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect();
            }, this.reconnectInterval);
        } else {
            this.addChatMessage('Max reconnection attempts reached. Please refresh the page.');
        }
    }

    setupEventListeners() {
        const customCommandInput = document.getElementById('customCommand');
        if (customCommandInput) {
            customCommandInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendCustomCommand();
                }
            });
        }

        setInterval(() => {
            this.requestUpdates();
        }, 10000);
    }

    requestUpdates() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'getStatus' }));
            this.ws.send(JSON.stringify({ type: 'getInventory' }));
            this.ws.send(JSON.stringify({ type: 'getStats' }));
        }
    }
}

function sendCommand(command) {
    if (window.dashboard) {
        window.dashboard.sendCommand(command);
    }
}

function sendCustomCommand() {
    const input = document.getElementById('customCommand');
    const command = input.value.trim();
    
    if (command && window.dashboard) {
        window.dashboard.sendCommand(command);
        input.value = '';
    }
}

function clearChatLog() {
    const chatContainer = document.getElementById('chatLog');
    chatContainer.innerHTML = '';
    
    if (window.dashboard) {
        window.dashboard.chatMessages = [];
        window.dashboard.addChatMessage('Chat log cleared');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new MinecraftBotDashboard();
});
