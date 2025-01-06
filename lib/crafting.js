export class CraftingSystem {
    constructor(bot) {
        this.bot = bot;
        this.recipes = new Map();
        this.initRecipes();
    }

    initRecipes() {
        this.recipes.set('sticks', {
            ingredients: { 'oak_planks': 2 },
            result: 'stick',
            count: 4
        });
        this.recipes.set('planks', {
            ingredients: { 'oak_log': 1 },
            result: 'oak_planks',
            count: 4
        });
        this.recipes.set('crafting_table', {
            ingredients: { 'oak_planks': 4 },
            result: 'crafting_table',
            count: 1
        });
        this.recipes.set('wooden_pickaxe', {
            ingredients: { 'oak_planks': 3, 'stick': 2 },
            result: 'wooden_pickaxe',
            count: 1,
            needsTable: true
        });
    }

    canCraft(recipeName) {
        const recipe = this.recipes.get(recipeName);
        if (!recipe) return false;

        for (const [ingredient, needed] of Object.entries(recipe.ingredients)) {
            const available = this.bot.inventory.items()
                .filter(item => item && item.name === ingredient)
                .reduce((total, item) => total + item.count, 0);
            
            if (available < needed) return false;
        }

        return true;
    }

    async craft(recipeName) {
        const recipe = this.recipes.get(recipeName);
        if (!recipe) {
            this.bot.chat(`Unknown recipe: ${recipeName}`);
            return false;
        }

        if (!this.canCraft(recipeName)) {
            this.bot.chat(`Missing ingredients for ${recipeName}`);
            return false;
        }

        try {
            if (recipe.needsTable) {
                await this.useCraftingTable(recipe);
            } else {
                await this.useInventory(recipe);
            }
            
            this.bot.chat(`Crafted ${recipe.result}!`);
            return true;
        } catch (err) {
            this.bot.chat(`Crafting failed: ${err.message}`);
            return false;
        }
    }

    async useInventory(recipe) {
        const recipeItems = [];
        for (const [ingredient, needed] of Object.entries(recipe.ingredients)) {
            const item = this.bot.inventory.items().find(item => 
                item && item.name === ingredient
            );
            if (item) {
                recipeItems.push({ item, count: needed });
            }
        }

        const craftingTable = await this.bot.recipesFor(
            this.bot.registry.itemsByName[recipe.result].id
        );
        
        if (craftingTable.length > 0) {
            await this.bot.craft(craftingTable[0], 1, null);
        }
    }

    async useCraftingTable(recipe) {
        const table = this.bot.findBlock({
            matching: this.bot.registry.blocksByName.crafting_table.id,
            maxDistance: 10
        });

        if (!table) {
            this.bot.chat('Need crafting table nearby!');
            return;
        }

        const craftingTable = await this.bot.openCraftingTable(table);
        const recipeObj = await this.bot.recipesFor(
            this.bot.registry.itemsByName[recipe.result].id,
            null,
            1,
            craftingTable
        );

        if (recipeObj.length > 0) {
            await this.bot.craft(recipeObj[0], 1, craftingTable);
        }

        craftingTable.close();
    }

    async autoCraft(itemName) {
        const recipes = Array.from(this.recipes.entries()).filter(([name, recipe]) => 
            recipe.result === itemName
        );

        for (const [recipeName, recipe] of recipes) {
            if (this.canCraft(recipeName)) {
                return await this.craft(recipeName);
            }
        }

        this.bot.chat(`Cannot craft ${itemName} - missing ingredients`);
        return false;
    }

    listRecipes() {
        const available = Array.from(this.recipes.entries())
            .filter(([name, recipe]) => this.canCraft(name))
            .map(([name]) => name)
            .slice(0, 5);
        
        if (available.length > 0) {
            this.bot.chat(`Can craft: ${available.join(', ')}`);
        } else {
            this.bot.chat('No craftable recipes available');
        }
    }
}
