export class ErrorHandler {
    constructor(bot) {
        this.bot = bot;
        this.reconnectAttempts = 0;
        this.maxReconnects = 10;
        this.setupHandlers();
    }

    setupHandlers() {
        this.bot.on('error', (err) => {
            console.error('Bot error:', err);
            this.handleError(err);
        });

        this.bot.on('end', () => {
            console.log('Bot disconnected, attempting reconnect...');
            this.attemptReconnect();
        });

        this.bot.on('kicked', (reason) => {
            console.error('Bot kicked:', reason);
            setTimeout(() => this.attemptReconnect(), 5000);
        });
    }

    handleError(error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('Connection refused, retrying...');
            this.attemptReconnect();
        } else if (error.code === 'ENOTFOUND') {
            console.log('Server not found, retrying...');
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnects) {
            console.log('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(30000, 1000 * this.reconnectAttempts);
        
        console.log(`Reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            try {
                this.bot.connect();
            } catch (err) {
                console.error('Reconnect failed:', err);
            }
        }, delay);
    }

    resetReconnectCounter() {
        this.reconnectAttempts = 0;
    }
}
