const CONSTANTS = require("../shared/constants");
const Player = require("./player");
const Projectile = require("./projectile");

class Game {
    constructor() {
        this.players = {};
        this.bullets = [];
        this.bulletIdCounter = 0;
        this.lastUpdateTime = Date.now();
        this.obstacles = [];
        this.setupObstacles();
        this.events = [];
        this.relics = [];
        for (let i = 0; i < CONSTANTS.RELIC_AMOUNT; i++) {
            this.spawnRelic();
        }

        this.gameStartTime = Date.now();
        this.timeLeft = CONSTANTS.MATCH_LENGTH;
        this.isGameOver = false;
        this.isPaused = false;
    }

    setupObstacles() {
        // A few strategically placed walls. Easy to add more later!
        this.obstacles = [
            // Center bunker
            { id: "obs_1", x: 1300, y: 600, w: 400, h: 300, color: "#444" },
            // Left flank wall
            { id: "obs_2", x: 400, y: 200, w: 100, h: 800, color: "#444" },
            // Right flank wall
            { id: "obs_3", x: 2500, y: 500, w: 100, h: 800, color: "#444" },
        ];
    }

    spawnRelic() {
        const pos = this.getSafePosition(30);
        this.relics.push({
            id: Math.random().toString(36).substring(2, 9), // Generate a random ID
            x: pos.x,
            y: pos.y,
        });
    }

    addPlayer(id) {
        // Find a safe spot BEFORE creating the player
        const pos = this.getSafePosition(CONSTANTS.PLAYER_SIZE);
        this.players[id] = new Player(id, pos.x, pos.y);
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

    getSafePosition(entitySize) {
        let x, y, isSafe;
        let attempts = 0;

        do {
            x = Math.random() * (CONSTANTS.WORLD_WIDTH - entitySize);
            y = Math.random() * (CONSTANTS.WORLD_HEIGHT - entitySize);
            isSafe = true;

            // Check against every obstacle
            for (const obs of this.obstacles) {
                if (
                    x < obs.x + obs.w &&
                    x + entitySize > obs.x &&
                    y < obs.y + obs.h &&
                    y + entitySize > obs.y
                ) {
                    isSafe = false;
                    break;
                }
            }
            attempts++;
        } while (!isSafe && attempts < 100); // Max 100 attempts to prevent infinite loops

        return { x, y };
    }

    updatePlayers(dt, now) {
        for (const id in this.players) {
            const p = this.players[id];
            p.update(dt, this.obstacles);

            // Relic Collision
            for (let i = this.relics.length - 1; i >= 0; i--) {
                const r = this.relics[i];
                if (
                    p.x < r.x + 30 &&
                    p.x + CONSTANTS.PLAYER_SIZE > r.x &&
                    p.y < r.y + 30 &&
                    p.y + CONSTANTS.PLAYER_SIZE > r.y
                ) {
                    p.score += 5;
                    this.relics.splice(i, 1); // Remove collected relic
                    this.spawnRelic(); // Spawn a new one somewhere else!
                }
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
            let hitWall = false;
            for (const obs of this.obstacles) {
                if (
                    b.x > obs.x &&
                    b.x < obs.x + obs.w &&
                    b.y > obs.y &&
                    b.y < obs.y + obs.h
                ) {
                    hitWall = true;
                    break;
                }
            }
            if (hitWall) {
                this.bullets.splice(i, 1); // Destroy bullet
                continue; // Move to next bullet
            }

            // Player Collision
            for (const targetId in this.players) {
                const target = this.players[targetId];
                if (b.hitsPlayer(target)) {
                    const wasKilled = target.takeDamage(
                        CONSTANTS.BULLET_DAMAGE,
                    );
                    if (wasKilled) {
                        if (this.players[b.ownerId]) {
                            this.players[b.ownerId].score += 1;
                            this.events.push({
                                killerColor: this.players[b.ownerId].color,
                                victimColor: target.color,
                            });
                        }

                        // Give the victim a safe respawn!
                        const safePos = this.getSafePosition(
                            CONSTANTS.PLAYER_SIZE,
                        );
                        target.respawn(safePos.x, safePos.y);
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
            relics: this.relics,
            timeLeft: this.timeLeft,
            isGameOver: this.isGameOver,
        };
    }
}

module.exports = Game;
