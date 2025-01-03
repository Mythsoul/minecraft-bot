export class CombatSystem {
    constructor(bot, inventoryManager) {
        this.bot = bot;
        this.inventoryManager = inventoryManager;
        this.isInCombat = false;
        this.currentTarget = null;
        this.autoAttack = false;
        this.hostileMobs = [
            'zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch',
            'vindicator', 'pillager', 'evoker', 'vex', 'ravager', 'phantom',
            'drowned', 'husk', 'stray', 'wither_skeleton', 'blaze', 'ghast'
        ];
    }

    startAutoAttack() {
        this.autoAttack = true;
        this.combatInterval = setInterval(() => {
            this.checkForHostiles();
        }, 500);
    }

    stopAutoAttack() {
        this.autoAttack = false;
        if (this.combatInterval) {
            clearInterval(this.combatInterval);
        }
        this.currentTarget = null;
        this.isInCombat = false;
    }

    async checkForHostiles() {
        if (!this.autoAttack || this.isInCombat) return;

        const hostiles = Object.values(this.bot.entities).filter(entity => {
            if (!entity || !entity.name) return false;
            const distance = this.bot.entity.position.distanceTo(entity.position);
            return this.hostileMobs.includes(entity.name) && distance < 16;
        });

        if (hostiles.length > 0) {
            const closest = hostiles.reduce((prev, curr) => {
                const prevDist = this.bot.entity.position.distanceTo(prev.position);
                const currDist = this.bot.entity.position.distanceTo(curr.position);
                return currDist < prevDist ? curr : prev;
            });

            await this.attackMob(closest);
        }
    }

    async attackMob(target) {
        if (!target || this.isInCombat) return;

        this.isInCombat = true;
        this.currentTarget = target;

        try {
            await this.inventoryManager.equipBestWeapon();
            this.bot.chat(`Engaging ${target.name}!`);

            while (target && target.isValid && !target.isDead) {
                const distance = this.bot.entity.position.distanceTo(target.position);
                
                if (distance > 20) {
                    this.bot.chat(`${target.name} too far away, disengaging`);
                    break;
                }

                if (distance > 4) {
                    this.bot.pathfinder.setGoal(new this.bot.pathfinder.goals.GoalFollow(target, 2));
                    await this.bot.waitForTicks(10);
                    continue;
                }

                if (distance <= 4) {
                    this.bot.pathfinder.setGoal(null);
                    await this.bot.lookAt(target.position.offset(0, target.height / 2, 0));
                    this.bot.attack(target);
                    await this.bot.waitForTicks(10);
                }
            }

            if (target.isDead) {
                this.bot.chat(`Defeated ${target.name}!`);
            }

        } catch (err) {
            console.error('Combat error:', err.message);
        } finally {
            this.isInCombat = false;
            this.currentTarget = null;
            this.bot.pathfinder.setGoal(null);
        }
    }

    async defendSelf() {
        const attacker = this.bot.nearestEntity(entity => {
            if (!entity || !entity.name) return false;
            const distance = this.bot.entity.position.distanceTo(entity.position);
            return this.hostileMobs.includes(entity.name) && distance < 8;
        });

        if (attacker) {
            await this.attackMob(attacker);
        }
    }

    getCombatStatus() {
        return {
            inCombat: this.isInCombat,
            autoAttack: this.autoAttack,
            target: this.currentTarget?.name || null,
            nearbyHostiles: Object.values(this.bot.entities).filter(entity => {
                if (!entity || !entity.name) return false;
                const distance = this.bot.entity.position.distanceTo(entity.position);
                return this.hostileMobs.includes(entity.name) && distance < 16;
            }).length
        };
    }
}
