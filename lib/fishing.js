export class FishingBot {
    constructor(bot) {
        this.bot = bot;
        this.fishing = false;
        this.fishingRod = null;
        this.currentHook = null;
        this.lastCast = 0;
        this.catches = 0;
    }

    async findWater() {
        const water = this.bot.findBlocks({
            matching: [this.bot.registry.blocksByName.water.id],
            maxDistance: 32,
            count: 20
        });
        return water;
    }

    async startFishing() {
        if (this.fishing) {
            this.bot.chat('Already fishing!');
            return;
        }

        const rod = this.bot.inventory.items().find(item => 
            item && item.name === 'fishing_rod'
        );

        if (!rod) {
            this.bot.chat('No fishing rod found!');
            return;
        }

        const water = await this.findWater();
        if (water.length === 0) {
            this.bot.chat('No water nearby for fishing!');
            return;
        }

        this.fishing = true;
        this.fishingRod = rod;
        this.bot.chat('Starting fishing...');

        try {
            await this.bot.equip(rod, 'hand');
            const waterPos = water[Math.floor(Math.random() * water.length)];
            await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalNear(waterPos.x, waterPos.y, waterPos.z, 3));
            await this.bot.lookAt(waterPos.offset(0, 1, 0));
            
            this.fishingLoop();
        } catch (err) {
            this.bot.chat(`Failed to start fishing: ${err.message}`);
            this.fishing = false;
        }
    }

    async fishingLoop() {
        while (this.fishing) {
            try {
                await this.castLine();
                await this.waitForFish();
                await this.bot.waitForTicks(20);
            } catch (err) {
                console.error('Fishing error:', err.message);
                await this.bot.waitForTicks(60);
            }
        }
    }

    async castLine() {
        if (this.currentHook) return;
        
        const rod = this.bot.inventory.slots[this.bot.getEquipmentDestSlot('hand')];
        if (!rod || rod.name !== 'fishing_rod') {
            await this.bot.equip(this.fishingRod, 'hand');
        }

        this.bot.activateItem();
        this.lastCast = Date.now();
    }

    async waitForFish() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.bot.removeListener('playerCollect', onCollect);
                resolve();
            }, 30000);

            const onCollect = (collector, collected) => {
                if (collector === this.bot.entity) {
                    const item = collected.getDroppedItem();
                    if (item && this.isFishItem(item.name)) {
                        this.catches++;
                        this.bot.chat(`Caught ${item.name}! Total catches: ${this.catches}`);
                    }
                    clearTimeout(timeout);
                    this.bot.removeListener('playerCollect', onCollect);
                    resolve();
                }
            };

            this.bot.on('playerCollect', onCollect);
            
            setTimeout(() => {
                this.bot.activateItem();
            }, Math.random() * 3000 + 2000);
        });
    }

    isFishItem(itemName) {
        const fishItems = [
            'cod', 'salmon', 'tropical_fish', 'pufferfish',
            'cooked_cod', 'cooked_salmon'
        ];
        return fishItems.includes(itemName);
    }

    stopFishing() {
        this.fishing = false;
        this.currentHook = null;
        this.bot.chat(`Fishing stopped. Total catches: ${this.catches}`);
    }

    getFishingStatus() {
        return {
            active: this.fishing,
            catches: this.catches,
            hasRod: this.bot.inventory.items().some(item => 
                item && item.name === 'fishing_rod'
            ),
            fishCount: this.bot.inventory.items()
                .filter(item => item && this.isFishItem(item.name))
                .reduce((total, item) => total + item.count, 0)
        };
    }
}
