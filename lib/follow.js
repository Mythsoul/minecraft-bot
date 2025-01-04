export class FollowSystem {
    constructor(bot) {
        this.bot = bot;
        this.following = false;
        this.target = null;
        this.followDistance = 3;
        this.maxDistance = 50;
    }

    startFollowing(playerName) {
        const player = this.bot.players[playerName];
        if (!player || !player.entity) {
            this.bot.chat(`Player ${playerName} not found!`);
            return false;
        }

        this.following = true;
        this.target = player;
        this.bot.chat(`Now following ${playerName}`);

        this.followLoop();
        return true;
    }

    stopFollowing() {
        this.following = false;
        this.target = null;
        this.bot.pathfinder.setGoal(null);
        this.bot.chat('Stopped following');
    }

    async followLoop() {
        while (this.following && this.target) {
            try {
                if (!this.target.entity) {
                    this.bot.chat(`Lost sight of ${this.target.username}`);
                    this.stopFollowing();
                    break;
                }

                const distance = this.bot.entity.position.distanceTo(this.target.entity.position);
                
                if (distance > this.maxDistance) {
                    this.bot.chat(`${this.target.username} too far away, stopping follow`);
                    this.stopFollowing();
                    break;
                }

                if (distance > this.followDistance) {
                    this.bot.pathfinder.setGoal(
                        new this.bot.pathfinder.goals.GoalFollow(this.target.entity, this.followDistance)
                    );
                }

                await this.bot.waitForTicks(10);
            } catch (err) {
                console.error('Follow error:', err.message);
                await this.bot.waitForTicks(20);
            }
        }
    }

    teleportToPlayer(playerName) {
        const player = this.bot.players[playerName];
        if (!player || !player.entity) {
            this.bot.chat(`Player ${playerName} not found!`);
            return;
        }

        const pos = player.entity.position;
        this.bot.chat(`/tp ${this.bot.username} ${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}`);
    }

    setFollowDistance(distance) {
        this.followDistance = Math.max(1, Math.min(10, distance));
        this.bot.chat(`Follow distance set to ${this.followDistance} blocks`);
    }

    getFollowStatus() {
        return {
            following: this.following,
            target: this.target?.username || null,
            distance: this.target?.entity ? 
                this.bot.entity.position.distanceTo(this.target.entity.position) : null,
            followDistance: this.followDistance
        };
    }

    async guardPlayer(playerName) {
        const player = this.bot.players[playerName];
        if (!player || !player.entity) {
            this.bot.chat(`Player ${playerName} not found!`);
            return;
        }

        this.bot.chat(`Now guarding ${playerName}`);
        
        while (this.following && this.target === player) {
            const nearbyHostiles = Object.values(this.bot.entities).filter(entity => {
                if (!entity || !entity.name) return false;
                const hostileMobs = ['zombie', 'skeleton', 'spider', 'creeper'];
                const distanceToPlayer = player.entity.position.distanceTo(entity.position);
                return hostileMobs.includes(entity.name) && distanceToPlayer < 8;
            });

            if (nearbyHostiles.length > 0) {
                this.bot.chat(`Protecting ${playerName} from ${nearbyHostiles.length} hostiles!`);
                for (const hostile of nearbyHostiles) {
                    try {
                        await this.bot.lookAt(hostile.position.offset(0, hostile.height / 2, 0));
                        this.bot.attack(hostile);
                        await this.bot.waitForTicks(10);
                    } catch (err) {
                        continue;
                    }
                }
            }

            await this.bot.waitForTicks(20);
        }
    }
}
