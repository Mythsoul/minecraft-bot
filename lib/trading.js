export class TradingSystem {
    constructor(bot) {
        this.bot = bot;
        this.currentVillager = null;
    }

    async findVillagers() {
        return Object.values(this.bot.entities).filter(entity => 
            entity && entity.name === 'villager'
        );
    }

    async tradeWithVillager(villager) {
        try {
            this.currentVillager = villager;
            const tradeWindow = await this.bot.openVillager(villager);
            
            this.bot.chat(`Found villager with ${tradeWindow.trades?.length || 0} trades`);
            
            for (let i = 0; i < (tradeWindow.trades?.length || 0); i++) {
                const trade = tradeWindow.trades[i];
                if (this.canAffordTrade(trade)) {
                    await tradeWindow.makeTransaction(i);
                    this.bot.chat(`Completed trade ${i + 1}`);
                    break;
                }
            }
            
            tradeWindow.close();
        } catch (err) {
            this.bot.chat(`Trading failed: ${err.message}`);
        }
    }

    canAffordTrade(trade) {
        if (!trade.inputItem1) return false;
        
        const needed = trade.inputItem1.count;
        const available = this.bot.inventory.items()
            .filter(item => item && item.type === trade.inputItem1.type)
            .reduce((total, item) => total + item.count, 0);
            
        return available >= needed;
    }

    async startTrading() {
        const villagers = await this.findVillagers();
        
        if (villagers.length === 0) {
            this.bot.chat('No villagers found nearby');
            return;
        }

        this.bot.chat(`Found ${villagers.length} villagers, starting trades...`);
        
        for (const villager of villagers.slice(0, 3)) {
            await this.tradeWithVillager(villager);
            await this.bot.waitForTicks(20);
        }
        
        this.bot.chat('Trading session complete');
    }
}
