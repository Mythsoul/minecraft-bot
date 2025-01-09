export class BackupSystem {
    constructor(bot) {
        this.bot = bot;
        this.deathLocation = null;
        this.lastKnownItems = [];
        this.setupDeathHandling();
    }

    setupDeathHandling() {
        this.bot.on('death', () => {
            this.deathLocation = this.bot.entity.position.clone();
            this.bot.chat('I died! Location saved for recovery');
            console.log('Death location:', this.deathLocation);
        });

        this.bot.on('respawn', () => {
            this.bot.chat('Respawned. Use !recover to return to death location');
        });

        setInterval(() => {
            this.backupInventory();
        }, 30000);
    }

    backupInventory() {
        this.lastKnownItems = this.bot.inventory.items().map(item => ({
            name: item.name,
            count: item.count,
            slot: item.slot
        }));
    }

    async recoverFromDeath() {
        if (!this.deathLocation) {
            this.bot.chat('No death location recorded');
            return;
        }

        this.bot.chat('Heading to death location to recover items...');
        
        try {
            const goal = new this.bot.pathfinder.goals.GoalNear(
                this.deathLocation.x, 
                this.deathLocation.y, 
                this.deathLocation.z, 
                5
            );
            
            await this.bot.pathfinder.goto(goal);
            this.bot.chat('Arrived at death location. Looking for items...');
            
            await this.collectNearbyItems();
            
        } catch (err) {
            this.bot.chat(`Recovery failed: ${err.message}`);
        }
    }

    async collectNearbyItems() {
        const items = Object.values(this.bot.entities).filter(entity => 
            entity.name === 'item' && 
            this.bot.entity.position.distanceTo(entity.position) < 10
        );

        let collected = 0;
        for (const item of items) {
            try {
                await this.bot.pathfinder.goto(
                    new this.bot.pathfinder.goals.GoalBlock(item.position.x, item.position.y, item.position.z)
                );
                collected++;
            } catch (err) {
                continue;
            }
        }

        this.bot.chat(`Recovery complete! Found ${collected} item stacks`);
    }

    getDeathInfo() {
        if (!this.deathLocation) {
            return 'No recent death recorded';
        }

        const distance = Math.floor(this.bot.entity.position.distanceTo(this.deathLocation));
        return `Death location: ${Math.floor(this.deathLocation.x)}, ${Math.floor(this.deathLocation.y)}, ${Math.floor(this.deathLocation.z)} (${distance}m away)`;
    }

    clearDeathLocation() {
        this.deathLocation = null;
        this.bot.chat('Death location cleared');
    }
}
