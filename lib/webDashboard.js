import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebDashboard {
    constructor(bot, systems, port = 3000) {
        this.bot = bot;
        this.systems = systems;
        this.port = port;
        this.app = express();
        this.server = createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });
        this.clients = new Set();
        
        this.setupRoutes();
        this.setupWebSocket();
    }

    setupRoutes() {
        this.app.use(express.static(path.join(__dirname, '../public')));
        this.app.use(express.json());

        this.app.get('/api/status', (req, res) => {
            res.json(this.getBotStatus());
        });

        this.app.get('/api/inventory', (req, res) => {
            res.json(this.getInventoryData());
        });

        this.app.get('/api/stats', (req, res) => {
            res.json(this.getStatsData());
        });

        this.app.post('/api/command', (req, res) => {
            const { command } = req.body;
            if (command) {
                this.executeCommand(command);
                res.json({ success: true, message: `Executed: ${command}` });
            } else {
                res.status(400).json({ success: false, message: 'No command provided' });
            }
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            console.log('Web client connected');
            
            ws.send(JSON.stringify({
                type: 'connected',
                data: this.getBotStatus()
            }));

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleWebSocketMessage(ws, message);
                } catch (err) {
                    console.error('WebSocket message error:', err);
                }
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('Web client disconnected');
            });
        });

        setInterval(() => {
            this.broadcastUpdate();
        }, 2000);
    }

    handleWebSocketMessage(ws, message) {
        switch (message.type) {
            case 'command':
                this.executeCommand(message.command);
                break;
            case 'getStatus':
                ws.send(JSON.stringify({
                    type: 'update',
                    data: this.getBotStatus()
                }));
                break;
            case 'getInventory':
                ws.send(JSON.stringify({
                    type: 'inventory',
                    data: this.getInventoryData()
                }));
                break;
            case 'getStats':
                ws.send(JSON.stringify({
                    type: 'stats',
                    data: this.getStatsData()
                }));
                break;
        }
    }

    executeCommand(command) {
        if (this.systems.commandSystem && command.startsWith('!')) {
            this.systems.commandSystem.handleCommand('web', command.slice(1));
        } else {
            this.bot.chat(command);
        }
    }

    getBotStatus() {
        const pos = this.bot.entity?.position || { x: 0, y: 0, z: 0 };
        return {
            online: true,
            health: this.bot.health || 0,
            food: this.bot.food || 0,
            position: {
                x: Math.floor(pos.x),
                y: Math.floor(pos.y),
                z: Math.floor(pos.z)
            },
            gameMode: this.bot.game?.gameMode || 'unknown',
            dimension: this.bot.game?.dimension || 'unknown',
            weather: this.bot.isRaining ? 'rain' : 'clear',
            time: this.bot.time?.timeOfDay || 0,
            systems: {
                autoEat: this.systems.autoEater?.getEatingStatus()?.needsFood || false,
                combat: this.systems.combatSystem?.getCombatStatus()?.autoAttack || false,
                farming: this.systems.farmingSystem?.getFarmingStatus()?.active || false,
                fishing: this.systems.fishingBot?.getFishingStatus()?.active || false
            }
        };
    }

    getInventoryData() {
        const items = this.bot.inventory?.items() || [];
        return {
            items: items.map(item => ({
                name: item.name,
                count: item.count,
                slot: item.slot
            })),
            usedSlots: items.length,
            totalSlots: 36
        };
    }

    getStatsData() {
        return {
            uptime: Math.floor((Date.now() - (this.systems.monitor?.stats.startTime || Date.now())) / 1000),
            blocksMinedTotal: this.systems.monitor?.stats.blocksMinedTotal || 0,
            distanceTraveled: Math.floor(this.systems.monitor?.stats.distanceTraveled || 0),
            combatKills: this.systems.monitor?.stats.combatKills || 0
        };
    }

    broadcastUpdate() {
        if (this.clients.size === 0) return;

        const update = {
            type: 'update',
            data: this.getBotStatus()
        };

        this.clients.forEach(client => {
            if (client.readyState === 1) {
                try {
                    client.send(JSON.stringify(update));
                } catch (err) {
                    console.error('Error sending update to client:', err);
                }
            }
        });
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`🌐 Web dashboard running at http://localhost:${this.port}`);
        });
    }

    stop() {
        this.server.close();
        this.wss.close();
    }
}
