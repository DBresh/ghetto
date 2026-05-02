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
        if (this.players[id]) {
            this.players[id].inputs = inputs;
        }
    }

    update() {
        if (this.isGameOver || this.isPaused) return this.getState();

        const now = Date.now();
        const dt = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        // Timer Logic
        const elapsedSeconds = Math.floor((now - this.gameStartTime) / 1000);
        this.timeLeft = Math.max(0, CONSTANTS.MATCH_LENGTH - elapsedSeconds);
        if (this.timeLeft === 0) this.isGameOver = true;

        // 1. UPDATE PLAYERS
        for (const id in this.players) {
            const p = this.players[id];
            p.update(dt); // <--- Math is now handled inside the Player class!

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

            // Shooting Logic
            if (p.canShoot(now)) {
                p.lastShotTime = now;
                const playerCenterX = p.x + CONSTANTS.PLAYER_SIZE / 2;
                const playerCenterY = p.y + CONSTANTS.PLAYER_SIZE / 2;

                // Use the player's already-calculated turret angle!
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

        // 2. UPDATE BULLETS & CHECK COLLISIONS
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(dt);

            if (b.isOutOfBounds()) {
                this.bullets.splice(i, 1);
                continue;
            }

            for (const targetId in this.players) {
                const target = this.players[targetId];

                // Ensure hitsPlayer exists and we don't shoot ourselves
                if (b.hitsPlayer(target)) {
                    // Apply damage. If it returns true, the target died!
                    const wasKilled = target.takeDamage(
                        CONSTANTS.BULLET_DAMAGE,
                    );

                    if (wasKilled && this.players[b.ownerId]) {
                        this.players[b.ownerId].score += 1; // Award kill point
                    }

                    this.bullets.splice(i, 1); // Destroy the bullet
                    break;
                }
            }
        }

        return this.getState();
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
