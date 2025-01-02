import mineflayer from "mineflayer";
import pkg from 'mineflayer-pathfinder';
const { pathfinder, Movements, goals } = pkg;

const bot = mineflayer.createBot({
    host: "in9.gbnodes.com",
    port: 25691,
    username: "randbot",
    version: "1.19.2",  // Add specific version
    auth: 'offline',    // Add offline mode
    viewDistance: "normal"
});

// Add pathfinder
bot.loadPlugin(pathfinder);

// Initialize pathfinder when bot spawns
bot.once('spawn', () => {
    const movements = new Movements(bot);
    bot.pathfinder.setMovements(movements);
});

// Single chat event handler
bot.on("chat", async (username, message) => {
    if (username === bot.username) return;
    
    switch(message) {
        case 'loaded':
            await bot.waitForChunksToLoad();
            bot.chat('Ready!');
            console.log('Current position:', bot.entity.position);
            break;
        
        case 'find diamonds':
            await findAndGoToDiamonds(diamonds);
            break;
        case 'end work': 
            bot.chat('Ending work');
            bot.respawn();
            break;
        case 'wear armor':
            await weararmor();
            break;
    }
    if (message.startsWith('find')) {
        const name = message.split(' ')[1];
        if (bot.registry.blocksByName[name] === undefined) {
            bot.chat(`${name} is not a block name`);
            return;
        }
        await findAndGoToBlock(name);
    }
});

async function findAndGoToBlock(blockName) {
    bot.chat(`Searching for ${blockName}...`);
    
    const blocks = bot.findBlocks({
        matching: bot.registry.blocksByName[blockName].id,
        maxDistance: 128,
        count: 100  // Find up to 100 blocks
    });

    if (blocks.length === 0) {
        bot.chat(`No ${blockName} found nearby!`);
        return;
    }

    bot.chat(`Found ${blocks.length} ${blockName} blocks! Starting mining operation...`);

    let successCount = 0;
    for (const targetPos of blocks) {
        try {
            // Move to block
            const goal = new goals.GoalBlock(targetPos.x, targetPos.y, targetPos.z);
            await bot.pathfinder.goto(goal);
            
            // Mine the block
            const block = bot.blockAt(targetPos);
            if (block && block.name === blockName) {
                bot.chat(`Mining ${blockName} at ${targetPos.x}, ${targetPos.y}, ${targetPos.z}`);
                await bot.dig(block);
                successCount++;
                
                // Progress update every 10 blocks
                if (successCount % 10 === 0) {
                    bot.chat(`Progress: Mined ${successCount} ${blockName} blocks`);
                }
            }
        } catch (err) {
            console.error(`Failed to mine block at ${targetPos.x, targetPos.y, targetPos.z}:`, err.message);
            continue; // Continue with next block even if one fails
        }
    }

    bot.chat(`Mining operation complete! Successfully mined ${successCount} ${blockName} blocks`);
}

async function weararmor() {
    const armorSlots = {
        helmet: 'head',
        chestplate: 'torso',
        leggings: 'legs',
        boots: 'feet'
    };

    // Get all items from inventory
    const items = bot.inventory.items();
    if (!items || items.length === 0) {
        bot.chat("No items in inventory!");
        return;
    }

    // Try to equip each type of armor
    for (const [armorType, slot] of Object.entries(armorSlots)) {
        const armorPiece = items.find(item => item && item.name && item.name.includes(armorType));
        if (armorPiece) {
            try {
                await bot.equip(armorPiece, slot);
                bot.chat(`Equipped ${armorPiece.name}`);
                await bot.wait(1000); // Wait for 1 second before equipping the next piece
            } catch (err) {
                bot.chat(`Failed to equip ${armorPiece.name}: ${err.message}`);
            }
        }
    }
}

// Connection events
bot.on("login", () => {
    console.log("Bot logged in successfully");
    bot.chat("loaded");
});

bot.on("spawn", () => {
    console.log("Bot spawned at:", bot.entity.position);
    bot.chat("find stone");
});

// Error handling
bot.on("error", (err) => {
    console.error("Bot error:", err);
});

bot.on("end", () => {
    console.log("Bot disconnected");
});

bot.on("kicked", (reason) => {
    console.error("Bot was kicked:", JSON.parse(reason));
});

