export class SecuritySystem {
    constructor(bot) {
        this.bot = bot;
        this.whitelist = ['owner1', 'admin1', 'trusted_user'];
        this.blacklist = [];
        this.adminUsers = ['owner1'];
        this.setupSecurity();
    }

    setupSecurity() {
        this.bot.on('chat', (username, message) => {
            if (this.isBlacklisted(username)) {
                return;
            }

            if (message.startsWith('!admin') && this.isAdmin(username)) {
                this.handleAdminCommand(username, message);
            }
        });

        this.bot.on('playerJoined', (player) => {
            if (this.isBlacklisted(player.username)) {
                this.bot.chat(`Warning: Blacklisted user ${player.username} joined`);
            }
        });
    }

    isWhitelisted(username) {
        return this.whitelist.includes(username);
    }

    isBlacklisted(username) {
        return this.blacklist.includes(username);
    }

    isAdmin(username) {
        return this.adminUsers.includes(username);
    }

    canUseCommand(username, commandLevel = 'user') {
        if (this.isBlacklisted(username)) return false;
        
        switch (commandLevel) {
            case 'admin':
                return this.isAdmin(username);
            case 'whitelist':
                return this.isWhitelisted(username);
            case 'user':
            default:
                return true;
        }
    }

    addToWhitelist(username) {
        if (!this.whitelist.includes(username)) {
            this.whitelist.push(username);
            this.bot.chat(`Added ${username} to whitelist`);
        }
    }

    removeFromWhitelist(username) {
        const index = this.whitelist.indexOf(username);
        if (index > -1) {
            this.whitelist.splice(index, 1);
            this.bot.chat(`Removed ${username} from whitelist`);
        }
    }

    addToBlacklist(username) {
        if (!this.blacklist.includes(username)) {
            this.blacklist.push(username);
            this.bot.chat(`Added ${username} to blacklist`);
        }
    }

    handleAdminCommand(username, message) {
        const args = message.split(' ').slice(1);
        const command = args[0];

        switch (command) {
            case 'whitelist':
                if (args[1] === 'add' && args[2]) {
                    this.addToWhitelist(args[2]);
                } else if (args[1] === 'remove' && args[2]) {
                    this.removeFromWhitelist(args[2]);
                } else {
                    this.bot.chat(`Whitelist: ${this.whitelist.join(', ')}`);
                }
                break;
            case 'blacklist':
                if (args[1] === 'add' && args[2]) {
                    this.addToBlacklist(args[2]);
                } else {
                    this.bot.chat(`Blacklist: ${this.blacklist.join(', ')}`);
                }
                break;
            case 'shutdown':
                this.bot.chat('Shutting down by admin command');
                process.exit(0);
                break;
        }
    }

    secureAction(username, action, requiredLevel = 'user') {
        if (!this.canUseCommand(username, requiredLevel)) {
            this.bot.chat(`Access denied for ${username}`);
            return false;
        }
        return true;
    }
}
