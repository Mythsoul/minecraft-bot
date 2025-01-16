export class ResourceMonitor {
    constructor(bot) {
        this.bot = bot;
        this.stats = {
            blocksMinedTotal: 0,
            itemsCrafted: 0,
            distanceTraveled: 0,
            timeOnline: 0,
            combatKills: 0,
            itemsCollected: new Map(),
            startTime: Date.now(),
            lastPosition: null
        };
        this.startMonitoring();
    }

    startMonitoring() {
        setInterval(() => {
            this.updateStats();
        }, 5000);

        this.bot.on('diggingCompleted', (block) => {
            this.stats.blocksMinedTotal++;
            this.addCollectedItem(block.name, 1);
        });

        this.bot.on('playerCollect', (collector, collected) => {
            if (collector === this.bot.entity) {
                const item = collected.getDroppedItem();
                if (item) {
                    this.addCollectedItem(item.name, item.count);
                }
            }
        });
    }

    updateStats() {
        this.stats.timeOnline = Math.floor((Date.now() - this.stats.startTime) / 1000);
        
        if (this.bot.entity && this.bot.entity.position) {
            if (this.stats.lastPosition) {
                const distance = this.bot.entity.position.distanceTo(this.stats.lastPosition);
                this.stats.distanceTraveled += distance;
            }
            
            this.stats.lastPosition = this.bot.entity.position.clone();
        }
    }

    addCollectedItem(itemName, count) {
        const current = this.stats.itemsCollected.get(itemName) || 0;
        this.stats.itemsCollected.set(itemName, current + count);
    }

    getStats() {
        const uptime = this.formatTime(this.stats.timeOnline);
        const distance = Math.floor(this.stats.distanceTraveled);
        
        return {
            uptime,
            blocksMinedTotal: this.stats.blocksMinedTotal,
            distanceTraveled: distance,
            combatKills: this.stats.combatKills,
            itemsCollected: this.stats.itemsCollected.size
        };
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
    }

    getTopItems() {
        return Array.from(this.stats.itemsCollected.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([item, count]) => `${item}: ${count}`)
            .join(', ');
    }

    showReport() {
        const stats = this.getStats();
        const topItems = this.getTopItems();
        
        this.bot.chat(`Stats - Uptime: ${stats.uptime} | Blocks: ${stats.blocksMinedTotal} | Distance: ${stats.distanceTraveled}m`);
        if (topItems) {
            this.bot.chat(`Top items: ${topItems}`);
        }
    }

    resetStats() {
        this.stats = {
            blocksMinedTotal: 0,
            itemsCrafted: 0,
            distanceTraveled: 0,
            timeOnline: 0,
            combatKills: 0,
            itemsCollected: new Map(),
            startTime: Date.now(),
            lastPosition: null
        };
        this.bot.chat('Statistics reset');
    }
}
