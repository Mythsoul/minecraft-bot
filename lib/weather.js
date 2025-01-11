export class WeatherSystem {
    constructor(bot) {
        this.bot = bot;
        this.currentWeather = 'clear';
        this.isNight = false;
        this.setupWeatherMonitoring();
    }

    setupWeatherMonitoring() {
        this.bot.on('time', () => {
            this.checkTimeOfDay();
        });

        this.bot.on('rain', () => {
            this.currentWeather = 'rain';
            this.bot.chat('Its raining! Taking shelter...');
            this.handleRain();
        });

        this.bot.on('thunderstorm', () => {
            this.currentWeather = 'thunderstorm';
            this.bot.chat('Thunderstorm detected! Seeking cover!');
            this.handleThunderstorm();
        });

        setInterval(() => {
            this.checkWeather();
        }, 10000);
    }

    checkTimeOfDay() {
        const time = this.bot.time.timeOfDay;
        const wasNight = this.isNight;
        this.isNight = time > 13000 && time < 23000;

        if (this.isNight && !wasNight) {
            this.bot.chat('Night is falling, hostile mobs will spawn');
            this.handleNight();
        } else if (!this.isNight && wasNight) {
            this.bot.chat('Dawn is breaking, its safe to venture out');
            this.handleDay();
        }
    }

    checkWeather() {
        const isRaining = this.bot.isRaining;
        const wasRaining = this.currentWeather !== 'clear';

        if (isRaining && !wasRaining) {
            this.currentWeather = 'rain';
            this.handleRainStart();
        } else if (!isRaining && wasRaining) {
            this.currentWeather = 'clear';
            this.handleRainStop();
        }
    }

    handleRainStart() {
        this.bot.chat('Rain started, adjusting activities...');
        if (this.bot.fishingBot) {
            this.bot.chat('Good weather for fishing!');
        }
    }

    handleRainStop() {
        this.bot.chat('Rain stopped, weather is clear');
    }

    handleRain() {
        this.findShelter();
    }

    handleThunderstorm() {
        this.findShelter();
        this.bot.chat('Avoiding water and high places during storm');
    }

    handleNight() {
        if (this.bot.combatSystem) {
            this.bot.combatSystem.startAutoAttack();
            this.bot.chat('Auto-combat enabled for night protection');
        }
        
        this.findLightedArea();
    }

    handleDay() {
        this.bot.chat('Day time activities can resume');
    }

    async findShelter() {
        const shelter = this.bot.findBlock({
            matching: (block) => {
                return block.name.includes('planks') || 
                       block.name.includes('cobblestone') ||
                       block.name.includes('stone');
            },
            maxDistance: 20
        });

        if (shelter) {
            try {
                await this.bot.pathfinder.goto(
                    new this.bot.pathfinder.goals.GoalNear(shelter.position.x, shelter.position.y, shelter.position.z, 2)
                );
                this.bot.chat('Found shelter from weather');
            } catch (err) {
                this.bot.chat('Could not reach shelter');
            }
        } else {
            this.bot.chat('No shelter found nearby');
        }
    }

    async findLightedArea() {
        const torch = this.bot.findBlock({
            matching: this.bot.registry.blocksByName.torch?.id,
            maxDistance: 30
        });

        if (torch) {
            try {
                await this.bot.pathfinder.goto(
                    new this.bot.pathfinder.goals.GoalNear(torch.position.x, torch.position.y, torch.position.z, 5)
                );
                this.bot.chat('Moved to lighted area for safety');
            } catch (err) {
                this.bot.chat('Could not reach lighted area');
            }
        }
    }

    getWeatherStatus() {
        const timeOfDay = this.isNight ? 'Night' : 'Day';
        return `Weather: ${this.currentWeather} | Time: ${timeOfDay}`;
    }

    shouldAvoidWater() {
        return this.currentWeather === 'thunderstorm';
    }

    shouldSeekShelter() {
        return this.currentWeather === 'thunderstorm' || 
               (this.currentWeather === 'rain' && this.isNight);
    }
}
