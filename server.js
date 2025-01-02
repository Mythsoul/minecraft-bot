import mineflayer from 'mineflayer';
import { Vec3 } from 'vec3';
import minecraftData from 'minecraft-data';
import { pathfinder } from 'mineflayer-pathfinder';

const options = { 
    host: 'in9.gbnodes.com',
    port: 25691,
    username: `RandBot`, // Random username to avoid conflicts

}

const bot = mineflayer.createBot(options);

// Add this right after creating the bot
bot.loadPlugin(pathfinder);

// Add error handling
bot.on('error', (err) => {
    console.log('Error:', err);
});

// Add login confirmation
bot.on('login', () => {
    console.log('Bot has logged in');
});

// Add disconnect handling
bot.on('kicked', (reason) => {
    console.log('Bot was kicked:', reason);
});

// Initialize mcData after bot is ready
let mcData;
bot.once('spawn', () => {
    mcData = minecraftData(bot.version);
});

async function craftItem(name, amount) {
    const item = mcData.itemsByName[name];
    const recipe = bot.recipesFor(item.id)[0];
    if (recipe) {
        try {
            await bot.craft(recipe, amount);
            bot.chat(`Crafted ${name}`);
        } catch (err) {
            bot.chat(`Error crafting ${name}`);
        }
    }
}

async function equipItem(name) {
    const item = bot.inventory.items().find(item => item.name.includes(name));
    if (item) {
        await bot.equip(item, 'hand');
    }
}

async function mineBlock(blockName) {
    if (!mcData) {
        bot.chat("Still initializing, please wait...");
        return false;
    }

    const block = mcData.blocksByName[blockName];
    if (!block) {
        bot.chat(`Cannot find block: ${blockName}`);
        return false;
    }

    const blocks = bot.findBlocks({
        matching: block.id,
        maxDistance: 32,
        count: 1
    });

    if (blocks.length) {
        const targetBlock = bot.blockAt(blocks[0]);
        try {
            await bot.pathfinder.goto(new Vec3(targetBlock.position.x, targetBlock.position.y, targetBlock.position.z));
            await bot.dig(targetBlock);
            return true;
        } catch (err) {
            console.log('Mining error:', err);
            return false;
        }
    }
    return false;
}

async function startMining() {
    if (!mcData) {
        bot.chat("Please wait for initialization...");
        return;
    }
    
    // First get wood
    bot.chat("Looking for wood...");
    await mineBlock('oak_log');
    
    // Craft wooden pickaxe
    await craftItem('wooden_pickaxe', 1);
    await equipItem('wooden_pickaxe');
    
    // Mine stone
    bot.chat("Mining stone...");
    await mineBlock('stone');
    
    // Craft stone tools
    await craftItem('stone_pickaxe', 1);
    await equipItem('stone_pickaxe');
    
    // Start looking for diamonds
    bot.chat("Searching for diamonds...");
    while (true) {
        const found = await mineBlock('diamond_ore');
        if (found) {
            bot.chat("Found diamonds!");
        }
    }
}

// karsakta h 
bot.on('message' , (message) => {
    if (message.toString().includes('bot teri maki chut')) {
        console.log(message.toString());
    }
    if (message.toString().includes('bot teri maki chut')) {
        bot.chat('teri maki chut');
    }
    if (message.toString().includes('bot mine')) {
        startMining();
    }
});

bot.on("spawn", () => {
    bot.chat("Hello world!");
}); 


function lookatNearestPlayer(){ 
    const playerFilter = (entity) => entity.type === 'player';
    const playerEntity = bot.nearestEntity(playerFilter);
    if (!playerEntity) return;
    const pos = playerEntity.position.offset(0, playerEntity.height, 0);
    bot.lookAt(pos);
}
bot.on('physicTick', lookatNearestPlayer);