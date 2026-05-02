const CONSTANTS = require("../shared/constants");
const Player = require("./player");
const Projectile = require("./projectile");

class Game {
    constructor() {
        this.players = {};
        this.bullets = [];
        this.bulletIdCounter = 0;
        this.lastUpdateTime = Date.now();

        this.relic = { x: 0, y: 0 };
        this.spawnRelic();

        this.gameStartTime = Date.now();
        this.timeLeft = CONSTANTS.MATCH_LENGTH;
        this.isGameOver = false;
        this.isPaused = false;
    }

    spawnRelic() {
        this.relic.x = Math.random() * (CONSTANTS.WORLD_WIDTH - 30);
        this.relic.y = Math.random() * (CONSTANTS.WORLD_HEIGHT - 30);
    }

    addPlayer(id) {
        this.players[id] = new Player(id);
    }
    removePlayer(id) {
        delete this.players[id];
    }

    handleInput(id, inputs) {
        if (this.players[id]) this.players[id].inputs = inputs;
    }

    // --- THE CLEANED UP MAIN LOOP ---
    update() {
        if (this.isGameOver || this.isPaused) return this.getState();

        const now = Date.now();
        const dt = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        this.updateTimer(now);
        this.updatePlayers(dt, now);
        this.updateBulletsAndCollisions(dt);

        return this.getState();
    }

    // --- HELPER METHODS ---

    updateTimer(now) {
        const elapsedSeconds = Math.floor((now - this.gameStartTime) / 1000);
        this.timeLeft = Math.max(0, CONSTANTS.MATCH_LENGTH - elapsedSeconds);
        if (this.timeLeft === 0) this.isGameOver = true;
    }

    updatePlayers(dt, now) {
        for (const id in this.players) {
            const p = this.players[id];
            p.update(dt);

            // Relic Collision
            if (
                p.x < this.relic.x + 30 &&
                p.x + CONSTANTS.PLAYER_SIZE > this.relic.x &&
                p.y < this.relic.y + 30 &&
                p.y + CONSTANTS.PLAYER_SIZE > this.relic.y
            ) {
                p.score += 5;
                this.spawnRelic();
            }

            // Shooting
            if (p.canShoot(now)) {
                p.lastShotTime = now;
                const playerCenterX = p.x + CONSTANTS.PLAYER_SIZE / 2;
                const playerCenterY = p.y + CONSTANTS.PLAYER_SIZE / 2;

                this.bullets.push(
                    new Projectile(
                        this.bulletIdCounter++,
                        p.id,
                        playerCenterX,
                        playerCenterY,
                        p.turretAngle,
                    ),
                );
            }
        }
    }

    updateBulletsAndCollisions(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(dt);

            if (b.isOutOfBounds()) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Player Collision
            for (const targetId in this.players) {
                const target = this.players[targetId];
                if (b.hitsPlayer(target)) {
                    const wasKilled = target.takeDamage(
                        CONSTANTS.BULLET_DAMAGE,
                    );
                    if (wasKilled && this.players[b.ownerId]) {
                        this.players[b.ownerId].score += 1;
                    }
                    this.bullets.splice(i, 1);
                    break;
                }
            }
        }
    }

    getState() {
        return {
            players: this.players,
            bullets: this.bullets,
            relic: this.relic,
            timeLeft: this.timeLeft,
            isGameOver: this.isGameOver,
        };
    }
}

module.exports = Game;
