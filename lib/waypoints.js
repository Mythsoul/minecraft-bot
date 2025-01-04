import fs from 'fs';

export class WaypointSystem {
    constructor(bot) {
        this.bot = bot;
        this.waypoints = new Map();
        this.waypointFile = './waypoints.json';
        this.loadWaypoints();
    }

    loadWaypoints() {
        try {
            if (fs.existsSync(this.waypointFile)) {
                const data = fs.readFileSync(this.waypointFile, 'utf8');
                const points = JSON.parse(data);
                this.waypoints = new Map(Object.entries(points));
                console.log(`Loaded ${this.waypoints.size} waypoints`);
            }
        } catch (err) {
            console.error('Failed to load waypoints:', err.message);
        }
    }

    saveWaypoints() {
        try {
            const data = Object.fromEntries(this.waypoints);
            fs.writeFileSync(this.waypointFile, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error('Failed to save waypoints:', err.message);
        }
    }

    addWaypoint(name, position = null) {
        const pos = position || this.bot.entity.position;
        const waypoint = {
            x: Math.floor(pos.x),
            y: Math.floor(pos.y),
            z: Math.floor(pos.z),
            dimension: this.bot.game.dimension,
            created: new Date().toISOString()
        };
        
        this.waypoints.set(name, waypoint);
        this.saveWaypoints();
        this.bot.chat(`Waypoint '${name}' saved at ${waypoint.x}, ${waypoint.y}, ${waypoint.z}`);
    }

    removeWaypoint(name) {
        if (this.waypoints.has(name)) {
            this.waypoints.delete(name);
            this.saveWaypoints();
            this.bot.chat(`Waypoint '${name}' removed`);
            return true;
        }
        this.bot.chat(`Waypoint '${name}' not found`);
        return false;
    }

    listWaypoints() {
        if (this.waypoints.size === 0) {
            this.bot.chat('No waypoints saved');
            return;
        }

        const list = Array.from(this.waypoints.entries())
            .map(([name, wp]) => `${name}: ${wp.x},${wp.y},${wp.z}`)
            .slice(0, 5);
        
        this.bot.chat(`Waypoints: ${list.join(' | ')}`);
        if (this.waypoints.size > 5) {
            this.bot.chat(`... and ${this.waypoints.size - 5} more`);
        }
    }

    async goToWaypoint(name) {
        const waypoint = this.waypoints.get(name);
        if (!waypoint) {
            this.bot.chat(`Waypoint '${name}' not found`);
            return false;
        }

        this.bot.chat(`Navigating to waypoint '${name}'...`);
        
        try {
            const goal = new this.bot.pathfinder.goals.GoalBlock(waypoint.x, waypoint.y, waypoint.z);
            await this.bot.pathfinder.goto(goal);
            this.bot.chat(`Arrived at waypoint '${name}'`);
            return true;
        } catch (err) {
            this.bot.chat(`Failed to reach waypoint '${name}': ${err.message}`);
            return false;
        }
    }

    getNearestWaypoint() {
        if (this.waypoints.size === 0) return null;

        const currentPos = this.bot.entity.position;
        let nearest = null;
        let minDistance = Infinity;

        for (const [name, waypoint] of this.waypoints) {
            const distance = Math.sqrt(
                Math.pow(currentPos.x - waypoint.x, 2) +
                Math.pow(currentPos.y - waypoint.y, 2) +
                Math.pow(currentPos.z - waypoint.z, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = { name, waypoint, distance };
            }
        }

        return nearest;
    }

    getDistance(name) {
        const waypoint = this.waypoints.get(name);
        if (!waypoint) return null;

        const currentPos = this.bot.entity.position;
        return Math.sqrt(
            Math.pow(currentPos.x - waypoint.x, 2) +
            Math.pow(currentPos.y - waypoint.y, 2) +
            Math.pow(currentPos.z - waypoint.z, 2)
        );
    }

    async visitAllWaypoints() {
        if (this.waypoints.size === 0) {
            this.bot.chat('No waypoints to visit');
            return;
        }

        this.bot.chat(`Starting tour of ${this.waypoints.size} waypoints...`);
        
        for (const [name, waypoint] of this.waypoints) {
            try {
                await this.goToWaypoint(name);
                await this.bot.waitForTicks(60);
            } catch (err) {
                this.bot.chat(`Skipping waypoint '${name}': ${err.message}`);
                continue;
            }
        }
        
        this.bot.chat('Tour complete!');
    }

    createPath(name, positions) {
        const path = {
            positions: positions.map(pos => ({
                x: Math.floor(pos.x),
                y: Math.floor(pos.y), 
                z: Math.floor(pos.z)
            })),
            created: new Date().toISOString()
        };
        
        this.waypoints.set(`path_${name}`, path);
        this.saveWaypoints();
        this.bot.chat(`Path '${name}' saved with ${positions.length} points`);
    }

    async followPath(name) {
        const path = this.waypoints.get(`path_${name}`);
        if (!path || !path.positions) {
            this.bot.chat(`Path '${name}' not found`);
            return;
        }

        this.bot.chat(`Following path '${name}'...`);
        
        for (let i = 0; i < path.positions.length; i++) {
            const pos = path.positions[i];
            try {
                const goal = new this.bot.pathfinder.goals.GoalBlock(pos.x, pos.y, pos.z);
                await this.bot.pathfinder.goto(goal);
                this.bot.chat(`Reached point ${i + 1}/${path.positions.length}`);
            } catch (err) {
                this.bot.chat(`Failed to reach point ${i + 1}: ${err.message}`);
                break;
            }
        }
        
        this.bot.chat(`Path '${name}' complete!`);
    }
}
