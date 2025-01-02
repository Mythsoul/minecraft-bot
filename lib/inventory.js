import { Vec3 } from 'vec3';

export class InventoryManager {
    constructor(bot) {
        this.bot = bot;
        this.lastInventoryCheck = 0;
        this.FOOD_ITEMS = [
            'bread', 'apple', 'pork', 'beef', 'chicken', 'fish', 'salmon',
            'cooked_pork', 'cooked_beef', 'cooked_chicken', 'cooked_fish',
            'cooked_salmon', 'potato', 'baked_potato', 'carrot', 'golden_carrot',
            'melon', 'cake', 'cookie', 'mushroom_stew', 'rabbit_stew'
        ];
        this.WEAPON_ITEMS = [
            'wooden_sword', 'stone_sword', 'iron_sword', 'golden_sword', 'diamond_sword',
            'netherite_sword', 'bow', 'crossbow', 'trident', 'wooden_axe', 'stone_axe',
            'iron_axe', 'golden_axe', 'diamond_axe', 'netherite_axe'
        ];
        this.TOOL_ITEMS = [
            'wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'golden_pickaxe',
            'diamond_pickaxe', 'netherite_pickaxe', 'wooden_shovel', 'stone_shovel',
            'iron_shovel', 'golden_shovel', 'diamond_shovel', 'netherite_shovel'
        ];
    }

    // Get current inventory status
    getInventoryStatus() {
        const items = this.bot.inventory.items();
        const emptySlots = this.bot.inventory.emptySlotCount();
        const usedSlots = items.length;
        const totalSlots = 36; // Standard inventory size

        return {
            items: items,
            usedSlots: usedSlots,
            emptySlots: emptySlots,
            totalSlots: totalSlots,
            isFull: emptySlots === 0
        };
    }

    // Find items by name
    findItems(itemName) {
        return this.bot.inventory.items().filter(item => 
            item && item.name && item.name.includes(itemName)
        );
    }

    // Find the best tool for a specific block
    findBestTool(block) {
        if (!block) return null;

        const tools = this.bot.inventory.items().filter(item => 
            item && this.TOOL_ITEMS.includes(item.name)
        );

        // Simple logic: prefer diamond > iron > stone > wooden
        const toolPriority = ['netherite', 'diamond', 'iron', 'stone', 'golden', 'wooden'];
        
        let bestTool = null;
        let bestPriority = -1;

        for (const tool of tools) {
            for (let i = 0; i < toolPriority.length; i++) {
                if (tool.name.includes(toolPriority[i])) {
                    if (i < bestPriority || bestPriority === -1) {
                        bestTool = tool;
                        bestPriority = i;
                    }
                    break;
                }
            }
        }

        return bestTool;
    }

    // Find the best weapon
    findBestWeapon() {
        const weapons = this.bot.inventory.items().filter(item => 
            item && this.WEAPON_ITEMS.includes(item.name)
        );

        // Prefer swords over other weapons, then by material quality
        const weaponPriority = ['netherite_sword', 'diamond_sword', 'iron_sword', 'stone_sword', 'golden_sword', 'wooden_sword'];
        
        for (const priorityWeapon of weaponPriority) {
            const weapon = weapons.find(w => w.name === priorityWeapon);
            if (weapon) return weapon;
        }

        // If no swords, return any weapon
        return weapons[0] || null;
    }

    // Find food items
    findFood() {
        return this.bot.inventory.items().filter(item => 
            item && this.FOOD_ITEMS.includes(item.name)
        );
    }

    // Find the best food (highest hunger restoration)
    findBestFood() {
        const foods = this.findFood();
        if (foods.length === 0) return null;

        // Priority based on hunger restoration (approximate values)
        const foodPriority = {
            'golden_carrot': 6,
            'cooked_beef': 8,
            'cooked_pork': 8,
            'cooked_chicken': 6,
            'cooked_salmon': 6,
            'cooked_fish': 5,
            'bread': 5,
            'baked_potato': 5,
            'carrot': 3,
            'potato': 1,
            'apple': 4
        };

        let bestFood = null;
        let bestValue = 0;

        for (const food of foods) {
            const value = foodPriority[food.name] || 2;
            if (value > bestValue) {
                bestFood = food;
                bestValue = value;
            }
        }

        return bestFood;
    }

    // Count specific items
    countItems(itemName) {
        return this.bot.inventory.items()
            .filter(item => item && item.name.includes(itemName))
            .reduce((total, item) => total + item.count, 0);
    }

    // Organize inventory by dropping less valuable items
    async organizeInventory() {
        const status = this.getInventoryStatus();
        
        if (!status.isFull) return;

        // Items to drop first (least valuable)
        const dropPriority = [
            'cobblestone', 'dirt', 'gravel', 'sand', 'stick', 'string',
            'rotten_flesh', 'bone', 'spider_eye', 'gunpowder'
        ];

        for (const dropItem of dropPriority) {
            const items = this.findItems(dropItem);
            for (const item of items) {
                try {
                    await this.bot.tossStack(item);
                    this.bot.chat(`Dropped ${item.count} ${item.name} to make space`);
                    
                    // Check if we have space now
                    if (this.bot.inventory.emptySlotCount() > 0) return;
                } catch (err) {
                    console.error(`Failed to drop ${item.name}:`, err.message);
                }
            }
        }
    }

    // Equip best tool for mining
    async equipBestTool(blockType) {
        const block = this.bot.blockAt(this.bot.entity.position.offset(0, -1, 0));
        const bestTool = this.findBestTool(block);
        
        if (bestTool && this.bot.inventory.slots[this.bot.getEquipmentDestSlot('hand')] !== bestTool) {
            try {
                await this.bot.equip(bestTool, 'hand');
                return bestTool;
            } catch (err) {
                console.error('Failed to equip tool:', err.message);
            }
        }
        return null;
    }

    // Equip best weapon
    async equipBestWeapon() {
        const bestWeapon = this.findBestWeapon();
        
        if (bestWeapon && this.bot.inventory.slots[this.bot.getEquipmentDestSlot('hand')] !== bestWeapon) {
            try {
                await this.bot.equip(bestWeapon, 'hand');
                return bestWeapon;
            } catch (err) {
                console.error('Failed to equip weapon:', err.message);
            }
        }
        return null;
    }

    // Check if inventory needs management
    shouldManageInventory() {
        const now = Date.now();
        if (now - this.lastInventoryCheck < 10000) return false; // Check every 10 seconds
        
        this.lastInventoryCheck = now;
        const status = this.getInventoryStatus();
        
        return status.emptySlots < 5; // Manage when less than 5 slots available
    }

    // Auto-manage inventory
    async autoManage() {
        if (!this.shouldManageInventory()) return;
        
        try {
            await this.organizeInventory();
            this.bot.chat('Inventory organized');
        } catch (err) {
            console.error('Auto inventory management failed:', err.message);
        }
    }

    // Get inventory summary for chat
    getInventorySummary() {
        const status = this.getInventoryStatus();
        const weapons = this.findItems('sword').length + this.findItems('axe').length;
        const tools = this.findItems('pickaxe').length + this.findItems('shovel').length;
        const food = this.findFood().length;
        const blocks = this.countItems('stone') + this.countItems('dirt') + this.countItems('cobblestone');

        return `Inventory: ${status.usedSlots}/${status.totalSlots} slots | Weapons: ${weapons} | Tools: ${tools} | Food: ${food} | Blocks: ${blocks}`;
    }
}
