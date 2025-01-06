export class CommandSystem {
    constructor(bot, systems) {
        this.bot = bot;
        this.systems = systems;
        this.commands = new Map();
        this.aliases = new Map();
        this.initCommands();
    }

    initCommands() {
        this.addCommand('help', this.showHelp.bind(this), 'Show available commands');
        this.addCommand('status', this.showStatus.bind(this), 'Show bot status');
        this.addCommand('inv', this.showInventory.bind(this), 'Show inventory');
        this.addCommand('eat', this.eatFood.bind(this), 'Force eat food');
        this.addCommand('fight', this.toggleCombat.bind(this), 'Toggle auto-combat [on/off]');
        this.addCommand('farm', this.farmAction.bind(this), 'Farm commands [start/stop]');
        this.addCommand('fish', this.fishAction.bind(this), 'Fishing commands [start/stop]');
        this.addCommand('follow', this.followPlayer.bind(this), 'Follow player [username]');
        this.addCommand('stop', this.stopAction.bind(this), 'Stop current action');
        this.addCommand('wp', this.waypointAction.bind(this), 'Waypoint commands [save/go/list] [name]');
        this.addCommand('come', this.comeHere.bind(this), 'Come to player');
        this.addCommand('mine', this.mineBlock.bind(this), 'Mine specific block [block_name]');
        this.addCommand('build', this.buildStructure.bind(this), 'Build structure [type]');

        this.addAlias('h', 'help');
        this.addAlias('s', 'status');
        this.addAlias('i', 'inv');
        this.addAlias('f', 'follow');
        this.addAlias('m', 'mine');
    }

    addCommand(name, handler, description) {
        this.commands.set(name, { handler, description });
    }

    addAlias(alias, command) {
        this.aliases.set(alias, command);
    }

    async handleCommand(username, message) {
        if (!message.startsWith('!')) return false;

        const args = message.slice(1).split(' ');
        const command = args[0].toLowerCase();
        const realCommand = this.aliases.get(command) || command;

        if (!this.commands.has(realCommand)) {
            this.bot.chat(`Unknown command: ${command}`);
            return true;
        }

        try {
            await this.commands.get(realCommand).handler(username, args.slice(1));
        } catch (err) {
            this.bot.chat(`Command error: ${err.message}`);
        }

        return true;
    }

    async showHelp(username, args) {
        const commands = Array.from(this.commands.entries())
            .slice(0, 5)
            .map(([name, cmd]) => `!${name}`)
            .join(', ');
        this.bot.chat(`Commands: ${commands} (and more)`);
    }

    async showStatus(username, args) {
        const health = this.bot.health;
        const hunger = this.bot.food;
        const pos = this.bot.entity.position;
        this.bot.chat(`Health: ${health}/20, Hunger: ${hunger}/20, Pos: ${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`);
    }

    async showInventory(username, args) {
        if (this.systems.inventoryManager) {
            this.bot.chat(this.systems.inventoryManager.getInventorySummary());
        }
    }

    async eatFood(username, args) {
        if (this.systems.autoEater) {
            await this.systems.autoEater.forceEat();
        }
    }

    async toggleCombat(username, args) {
        if (!this.systems.combatSystem) return;
        
        const action = args[0]?.toLowerCase();
        if (action === 'on') {
            this.systems.combatSystem.startAutoAttack();
            this.bot.chat('Auto-combat enabled');
        } else if (action === 'off') {
            this.systems.combatSystem.stopAutoAttack();
            this.bot.chat('Auto-combat disabled');
        } else {
            const status = this.systems.combatSystem.getCombatStatus();
            this.bot.chat(`Combat: ${status.autoAttack ? 'ON' : 'OFF'}`);
        }
    }

    async farmAction(username, args) {
        if (!this.systems.farmingSystem) return;
        
        const action = args[0]?.toLowerCase();
        if (action === 'start' || !action) {
            await this.systems.farmingSystem.startFarming();
        } else if (action === 'stop') {
            this.systems.farmingSystem.stopFarming();
        }
    }

    async fishAction(username, args) {
        if (!this.systems.fishingBot) return;
        
        const action = args[0]?.toLowerCase();
        if (action === 'start' || !action) {
            await this.systems.fishingBot.startFishing();
        } else if (action === 'stop') {
            this.systems.fishingBot.stopFishing();
        }
    }

    async followPlayer(username, args) {
        if (!this.systems.followSystem) return;
        
        const targetPlayer = args[0] || username;
        this.systems.followSystem.startFollowing(targetPlayer);
    }

    async stopAction(username, args) {
        this.bot.pathfinder.setGoal(null);
        if (this.systems.followSystem) this.systems.followSystem.stopFollowing();
        if (this.systems.fishingBot) this.systems.fishingBot.stopFishing();
        if (this.systems.farmingSystem) this.systems.farmingSystem.stopFarming();
        this.bot.chat('All actions stopped');
    }

    async waypointAction(username, args) {
        if (!this.systems.waypointSystem) return;
        
        const action = args[0]?.toLowerCase();
        const name = args[1];

        switch (action) {
            case 'save':
            case 'add':
                if (name) {
                    this.systems.waypointSystem.addWaypoint(name);
                } else {
                    this.bot.chat('Usage: !wp save [name]');
                }
                break;
            case 'go':
            case 'goto':
                if (name) {
                    await this.systems.waypointSystem.goToWaypoint(name);
                } else {
                    this.bot.chat('Usage: !wp go [name]');
                }
                break;
            case 'list':
                this.systems.waypointSystem.listWaypoints();
                break;
            case 'remove':
            case 'del':
                if (name) {
                    this.systems.waypointSystem.removeWaypoint(name);
                } else {
                    this.bot.chat('Usage: !wp remove [name]');
                }
                break;
            default:
                this.bot.chat('Usage: !wp [save/go/list/remove] [name]');
        }
    }

    async comeHere(username, args) {
        const player = this.bot.players[username];
        if (player && player.entity) {
            const pos = player.entity.position;
            const goal = new this.bot.pathfinder.goals.GoalNear(pos.x, pos.y, pos.z, 2);
            this.bot.pathfinder.setGoal(goal);
            this.bot.chat(`Coming to ${username}`);
        }
    }

    async mineBlock(username, args) {
        const blockName = args[0];
        if (!blockName) {
            this.bot.chat('Usage: !mine [block_name]');
            return;
        }
        
        if (this.bot.registry.blocksByName[blockName]) {
            await this.findAndMineBlock(blockName);
        } else {
            this.bot.chat(`${blockName} is not a valid block`);
        }
    }

    async findAndMineBlock(blockName) {
        const blocks = this.bot.findBlocks({
            matching: this.bot.registry.blocksByName[blockName].id,
            maxDistance: 64,
            count: 10
        });

        if (blocks.length === 0) {
            this.bot.chat(`No ${blockName} found nearby`);
            return;
        }

        this.bot.chat(`Found ${blocks.length} ${blockName}, starting mining...`);
        
        for (const pos of blocks.slice(0, 5)) {
            try {
                const goal = new this.bot.pathfinder.goals.GoalBlock(pos.x, pos.y, pos.z);
                await this.bot.pathfinder.goto(goal);
                const block = this.bot.blockAt(pos);
                if (block && block.name === blockName) {
                    await this.bot.dig(block);
                }
            } catch (err) {
                continue;
            }
        }
        
        this.bot.chat('Mining complete');
    }

    async buildStructure(username, args) {
        const type = args[0];
        if (!type) {
            this.bot.chat('Usage: !build [house/tower/bridge]');
            return;
        }

        switch (type) {
            case 'house':
                await this.buildHouse();
                break;
            case 'tower':
                await this.buildTower();
                break;
            case 'bridge':
                await this.buildBridge();
                break;
            default:
                this.bot.chat('Available builds: house, tower, bridge');
        }
    }

    async buildHouse() {
        this.bot.chat('Building a simple house...');
        const pos = this.bot.entity.position.clone().floor();
        const blocks = this.bot.inventory.items().filter(item => 
            item && (item.name.includes('planks') || item.name.includes('cobblestone'))
        );
        
        if (blocks.length === 0) {
            this.bot.chat('No building blocks found!');
            return;
        }

        try {
            await this.bot.equip(blocks[0], 'hand');
            for (let x = 0; x < 5; x++) {
                for (let z = 0; z < 5; z++) {
                    if (x === 0 || x === 4 || z === 0 || z === 4) {
                        const buildPos = pos.offset(x, 0, z);
                        const referenceBlock = this.bot.blockAt(buildPos.offset(0, -1, 0));
                        if (referenceBlock.name !== 'air') {
                            await this.bot.placeBlock(referenceBlock, new this.bot.Vec3(0, 1, 0));
                            await this.bot.waitForTicks(5);
                        }
                    }
                }
            }
            this.bot.chat('House walls complete!');
        } catch (err) {
            this.bot.chat(`Build failed: ${err.message}`);
        }
    }

    async buildTower() {
        this.bot.chat('Building tower...');
        const startPos = this.bot.entity.position.clone().floor();
        const blocks = this.bot.inventory.items().filter(item => 
            item && item.name.includes('cobblestone')
        );
        
        if (blocks.length === 0) {
            this.bot.chat('Need cobblestone blocks!');
            return;
        }

        try {
            await this.bot.equip(blocks[0], 'hand');
            for (let y = 0; y < 8; y++) {
                const buildPos = startPos.offset(0, y, 0);
                const referenceBlock = this.bot.blockAt(buildPos.offset(0, -1, 0));
                if (referenceBlock.name !== 'air') {
                    await this.bot.placeBlock(referenceBlock, new this.bot.Vec3(0, 1, 0));
                    await this.bot.waitForTicks(10);
                }
            }
            this.bot.chat('Tower complete!');
        } catch (err) {
            this.bot.chat(`Tower build failed: ${err.message}`);
        }
    }

    async buildBridge() {
        this.bot.chat('Building bridge...');
        this.bot.chat('Bridge building not implemented yet');
    }
}
