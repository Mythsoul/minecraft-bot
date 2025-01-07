export class SmeltingSystem {
    constructor(bot) {
        this.bot = bot;
        this.smeltingQueue = [];
        this.activeFurnaces = new Map();
    }

    async findFurnace() {
        return this.bot.findBlock({
            matching: this.bot.registry.blocksByName.furnace.id,
            maxDistance: 16
        });
    }

    async startSmelting(itemName, fuelName = 'coal') {
        const furnace = await this.findFurnace();
        if (!furnace) {
            this.bot.chat('No furnace found nearby!');
            return false;
        }

        const items = this.bot.inventory.items().filter(item => 
            item && item.name.includes(itemName)
        );
        const fuel = this.bot.inventory.items().filter(item => 
            item && item.name.includes(fuelName)
        );

        if (items.length === 0) {
            this.bot.chat(`No ${itemName} to smelt`);
            return false;
        }

        if (fuel.length === 0) {
            this.bot.chat(`No ${fuelName} for fuel`);
            return false;
        }

        try {
            const furnaceWindow = await this.bot.openFurnace(furnace);
            
            await furnaceWindow.putFuel(fuel[0].type, null, fuel[0].count);
            await furnaceWindow.putInput(items[0].type, null, items[0].count);
            
            this.bot.chat(`Started smelting ${items[0].count} ${itemName}`);
            
            setTimeout(() => {
                this.checkFurnace(furnace, furnaceWindow);
            }, 10000);

            return true;
        } catch (err) {
            this.bot.chat(`Smelting failed: ${err.message}`);
            return false;
        }
    }

    async checkFurnace(furnace, furnaceWindow) {
        try {
            const result = await furnaceWindow.takeOutput();
            if (result) {
                this.bot.chat(`Smelting complete! Got ${result.count} ${result.name}`);
            }
            furnaceWindow.close();
        } catch (err) {
            console.error('Furnace check error:', err.message);
        }
    }

    async smeltAll() {
        const smeltable = ['iron_ore', 'gold_ore', 'cobblestone', 'raw_iron', 'raw_gold'];
        let smelted = 0;

        for (const item of smeltable) {
            const success = await this.startSmelting(item);
            if (success) smelted++;
        }

        this.bot.chat(`Started smelting ${smelted} item types`);
    }
}
