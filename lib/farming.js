export class FarmingSystem {
    constructor(bot) {
        this.bot = bot;
        this.farmingActive = false;
        this.crops = {
            wheat: { item: 'wheat_seeds', mature: 7 },
            carrots: { item: 'carrot', mature: 7 },
            potatoes: { item: 'potato', mature: 7 },
            beetroots: { item: 'beetroot_seeds', mature: 3 }
        };
    }

    async findFarmland() {
        const farmland = this.bot.findBlocks({
            matching: this.bot.registry.blocksByName.farmland.id,
            maxDistance: 64,
            count: 100
        });
        return farmland;
    }

    async findMatureCrops() {
        const mature = [];
        for (const [cropName, cropData] of Object.entries(this.crops)) {
            const blocks = this.bot.findBlocks({
                matching: this.bot.registry.blocksByName[cropName].id,
                maxDistance: 64,
                count: 50
            });

            for (const pos of blocks) {
                const block = this.bot.blockAt(pos);
                if (block && block.metadata >= cropData.mature) {
                    mature.push({ pos, block, cropName, cropData });
                }
            }
        }
        return mature;
    }

    async harvestCrop(cropInfo) {
        try {
            const { pos, block, cropName, cropData } = cropInfo;
            
            await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalBlock(pos.x, pos.y, pos.z));
            await this.bot.dig(block);
            
            this.bot.chat(`Harvested ${cropName}`);
            
            const seedItem = this.bot.inventory.items().find(item => 
                item && item.name === cropData.item
            );
            
            if (seedItem) {
                await this.replantCrop(pos, seedItem);
            }
            
            return true;
        } catch (err) {
            console.error(`Failed to harvest crop:`, err.message);
            return false;
        }
    }

    async replantCrop(pos, seedItem) {
        try {
            const referenceBlock = this.bot.blockAt(pos.offset(0, -1, 0));
            await this.bot.equip(seedItem, 'hand');
            await this.bot.placeBlock(referenceBlock, new this.bot.Vec3(0, 1, 0));
            this.bot.chat(`Replanted crop`);
        } catch (err) {
            console.error(`Failed to replant:`, err.message);
        }
    }

    async plantSeeds() {
        const farmland = await this.findFarmland();
        let planted = 0;

        for (const pos of farmland) {
            const blockAbove = this.bot.blockAt(pos.offset(0, 1, 0));
            if (blockAbove.name === 'air') {
                for (const [cropName, cropData] of Object.entries(this.crops)) {
                    const seeds = this.bot.inventory.items().find(item => 
                        item && item.name === cropData.item
                    );
                    
                    if (seeds) {
                        try {
                            await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalBlock(pos.x, pos.y + 1, pos.z));
                            const farmlandBlock = this.bot.blockAt(pos);
                            await this.bot.equip(seeds, 'hand');
                            await this.bot.placeBlock(farmlandBlock, new this.bot.Vec3(0, 1, 0));
                            planted++;
                            this.bot.chat(`Planted ${cropName}`);
                            break;
                        } catch (err) {
                            continue;
                        }
                    }
                }
            }
        }
        
        return planted;
    }

    async startFarming() {
        if (this.farmingActive) {
            this.bot.chat('Already farming!');
            return;
        }

        this.farmingActive = true;
        this.bot.chat('Starting farming operation...');

        try {
            const matureCrops = await this.findMatureCrops();
            let harvested = 0;

            for (const crop of matureCrops) {
                if (!this.farmingActive) break;
                
                const success = await this.harvestCrop(crop);
                if (success) harvested++;
            }

            const planted = await this.plantSeeds();
            
            this.bot.chat(`Farming complete! Harvested: ${harvested}, Planted: ${planted}`);
            
        } catch (err) {
            this.bot.chat(`Farming failed: ${err.message}`);
        } finally {
            this.farmingActive = false;
        }
    }

    stopFarming() {
        this.farmingActive = false;
        this.bot.chat('Stopping farming operation');
    }

    async makeFarmland(area) {
        const { x1, z1, x2, z2, y } = area;
        let created = 0;

        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
                try {
                    const pos = new this.bot.Vec3(x, y, z);
                    const block = this.bot.blockAt(pos);
                    
                    if (block.name === 'grass_block' || block.name === 'dirt') {
                        const hoe = this.bot.inventory.items().find(item => 
                            item && item.name.includes('hoe')
                        );
                        
                        if (hoe) {
                            await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalBlock(x, y, z));
                            await this.bot.equip(hoe, 'hand');
                            await this.bot.activateBlock(block);
                            created++;
                        }
                    }
                } catch (err) {
                    continue;
                }
            }
        }
        
        this.bot.chat(`Created ${created} farmland blocks`);
        return created;
    }

    getFarmingStatus() {
        return {
            active: this.farmingActive,
            seeds: Object.values(this.crops).map(crop => ({
                name: crop.item,
                count: this.bot.inventory.items()
                    .filter(item => item && item.name === crop.item)
                    .reduce((total, item) => total + item.count, 0)
            }))
        };
    }
}
