export class MobFarmHelper {
    constructor(bot) {
        this.bot = bot;
        this.farmActive = false;
        this.spawnersFound = [];
    }

    async findSpawners() {
        const spawners = this.bot.findBlocks({
            matching: this.bot.registry.blocksByName.spawner?.id,
            maxDistance: 50,
            count: 10
        });
        
        this.spawnersFound = spawners;
        this.bot.chat(`Found ${spawners.length} spawners nearby`);
        return spawners;
    }

    async setupMobFarm(spawnerPos) {
        this.bot.chat('Setting up mob farm area...');
        
        try {
            await this.bot.pathfinder.goto(
                new this.bot.pathfinder.goals.GoalNear(spawnerPos.x, spawnerPos.y, spawnerPos.z, 3)
            );
            
            await this.clearArea(spawnerPos);
            await this.buildKillChamber(spawnerPos);
            
            this.bot.chat('Mob farm setup complete!');
        } catch (err) {
            this.bot.chat(`Farm setup failed: ${err.message}`);
        }
    }

    async clearArea(center) {
        const clearRadius = 3;
        let cleared = 0;
        
        for (let x = -clearRadius; x <= clearRadius; x++) {
            for (let y = -2; y <= 3; y++) {
                for (let z = -clearRadius; z <= clearRadius; z++) {
                    const pos = center.offset(x, y, z);
                    const block = this.bot.blockAt(pos);
                    
                    if (block && block.name !== 'air' && block.name !== 'spawner') {
                        try {
                            await this.bot.dig(block);
                            cleared++;
                            await this.bot.waitForTicks(2);
                        } catch (err) {
                            continue;
                        }
                    }
                }
            }
        }
        
        this.bot.chat(`Cleared ${cleared} blocks around spawner`);
    }

    async buildKillChamber(spawnerPos) {
        const cobblestone = this.bot.inventory.items().find(item => 
            item && item.name.includes('cobblestone')
        );
        
        if (!cobblestone) {
            this.bot.chat('Need cobblestone for kill chamber');
            return;
        }

        await this.bot.equip(cobblestone, 'hand');
        
        const killPos = spawnerPos.offset(0, -3, 0);
        
        try {
            for (let x = -1; x <= 1; x++) {
                for (let z = -1; z <= 1; z++) {
                    if (x === 0 && z === 0) continue;
                    
                    const wallPos = killPos.offset(x, 1, z);
                    const referenceBlock = this.bot.blockAt(wallPos.offset(0, -1, 0));
                    
                    if (referenceBlock.name !== 'air') {
                        await this.bot.placeBlock(referenceBlock, new this.bot.Vec3(0, 1, 0));
                        await this.bot.waitForTicks(5);
                    }
                }
            }
            
            this.bot.chat('Kill chamber built');
        } catch (err) {
            this.bot.chat(`Chamber build failed: ${err.message}`);
        }
    }

    async startMobFarm() {
        if (this.farmActive) {
            this.bot.chat('Mob farm already active');
            return;
        }

        const spawners = await this.findSpawners();
        if (spawners.length === 0) {
            this.bot.chat('No spawners found for mob farm');
            return;
        }

        this.farmActive = true;
        const spawner = spawners[0];
        
        await this.setupMobFarm(spawner);
        await this.farmLoop(spawner);
    }

    async farmLoop(spawnerPos) {
        this.bot.chat('Starting mob farm operation...');
        
        while (this.farmActive) {
            try {
                const killPos = spawnerPos.offset(0, -3, 0);
                await this.bot.pathfinder.goto(
                    new this.bot.pathfinder.goals.GoalBlock(killPos.x, killPos.y, killPos.z)
                );
                
                const nearbyMobs = Object.values(this.bot.entities).filter(entity => {
                    if (!entity || !entity.name) return false;
                    const hostileMobs = ['zombie', 'skeleton', 'spider', 'creeper'];
                    const distance = this.bot.entity.position.distanceTo(entity.position);
                    return hostileMobs.includes(entity.name) && distance < 5;
                });

                for (const mob of nearbyMobs) {
                    try {
                        await this.bot.lookAt(mob.position.offset(0, mob.height / 2, 0));
                        this.bot.attack(mob);
                        await this.bot.waitForTicks(5);
                    } catch (err) {
                        continue;
                    }
                }

                await this.bot.waitForTicks(40);
            } catch (err) {
                console.error('Mob farm error:', err.message);
                await this.bot.waitForTicks(60);
            }
        }
    }

    stopMobFarm() {
        this.farmActive = false;
        this.bot.chat('Mob farm stopped');
    }

    getMobFarmStatus() {
        return {
            active: this.farmActive,
            spawnersFound: this.spawnersFound.length
        };
    }
}
