export class AutoEater {
    constructor(bot, inventoryManager) {
        this.bot = bot;
        this.inventoryManager = inventoryManager;
        this.isEating = false;
        this.lastEatTime = 0;
        this.healthThreshold = 15; // Eat when health below 15 (out of 20)
        this.hungerThreshold = 16; // Eat when hunger below 16 (out of 20)
        this.minEatInterval = 3000; // Minimum 3 seconds between eating attempts
        
        this.startAutoEating();
    }

    startAutoEating() {
        // Check every 2 seconds if we need to eat
        this.eatInterval = setInterval(() => {
            this.checkAndEat();
        }, 2000);

        // Also check when health changes
        this.bot.on('health', () => {
            if (this.shouldEat()) {
                setTimeout(() => this.checkAndEat(), 100);
            }
        });
    }

    stopAutoEating() {
        if (this.eatInterval) {
            clearInterval(this.eatInterval);
            this.eatInterval = null;
        }
    }

    shouldEat() {
        const now = Date.now();
        
        // Don't eat too frequently
        if (now - this.lastEatTime < this.minEatInterval) {
            return false;
        }

        // Don't eat if already eating
        if (this.isEating) {
            return false;
        }

        // Check if health or hunger is low
        const health = this.bot.health;
        const food = this.bot.food;
        
        return health < this.healthThreshold || food < this.hungerThreshold;
    }

    async checkAndEat() {
        if (!this.shouldEat()) return;

        try {
            await this.eatFood();
        } catch (err) {
            console.error('Auto-eat failed:', err.message);
        }
    }

    async eatFood() {
        this.isEating = true;
        
        try {
            const food = this.inventoryManager.findBestFood();
            
            if (!food) {
                this.bot.chat('No food available! Need to find some food.');
                return false;
            }

            // Equip the food
            await this.bot.equip(food, 'hand');
            
            // Check if we can actually eat (not at full hunger for most foods)
            if (this.bot.food >= 20 && this.bot.health >= 20) {
                return false;
            }

            this.bot.chat(`Eating ${food.name} (Health: ${this.bot.health}/20, Hunger: ${this.bot.food}/20)`);
            
            // Start eating
            await this.bot.consume();
            
            this.lastEatTime = Date.now();
            this.bot.chat(`Finished eating ${food.name}`);
            
            return true;
            
        } catch (err) {
            if (err.message.includes('cannot eat')) {
                // Can't eat right now (probably full), that's ok
                return false;
            }
            throw err;
        } finally {
            this.isEating = false;
        }
    }

    // Manually trigger eating
    async forceEat() {
        if (this.isEating) {
            this.bot.chat('Already eating!');
            return;
        }

        const oldThresholds = {
            health: this.healthThreshold,
            hunger: this.hungerThreshold
        };

        // Temporarily lower thresholds to force eating
        this.healthThreshold = 20;
        this.hungerThreshold = 20;

        try {
            const success = await this.eatFood();
            if (!success) {
                this.bot.chat('Cannot eat right now - no food or already full');
            }
        } finally {
            // Restore original thresholds
            this.healthThreshold = oldThresholds.health;
            this.hungerThreshold = oldThresholds.hunger;
        }
    }

    // Get eating status
    getEatingStatus() {
        const health = this.bot.health;
        const hunger = this.bot.food;
        const foodItems = this.inventoryManager.findFood();
        
        return {
            health: health,
            hunger: hunger,
            maxHealth: 20,
            maxHunger: 20,
            isEating: this.isEating,
            foodCount: foodItems.length,
            needsFood: this.shouldEat(),
            lastEatTime: this.lastEatTime
        };
    }

    // Configure eating thresholds
    setThresholds(healthThreshold, hungerThreshold) {
        this.healthThreshold = Math.max(0, Math.min(20, healthThreshold));
        this.hungerThreshold = Math.max(0, Math.min(20, hungerThreshold));
        
        this.bot.chat(`Auto-eat thresholds set: Health < ${this.healthThreshold}, Hunger < ${this.hungerThreshold}`);
    }

    // Emergency eating (when health is critically low)
    async emergencyEat() {
        if (this.bot.health >= 6) return; // Only for critical health

        this.bot.chat('EMERGENCY EATING - CRITICAL HEALTH!');
        
        const foods = this.inventoryManager.findFood();
        for (const food of foods) {
            try {
                await this.bot.equip(food, 'hand');
                await this.bot.consume();
                this.bot.chat(`Emergency ate ${food.name}`);
                
                if (this.bot.health > 10) break; // Stop when health is safer
            } catch (err) {
                console.error(`Failed to emergency eat ${food.name}:`, err.message);
                continue;
            }
        }
    }
}
