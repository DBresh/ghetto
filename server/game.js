// server/game.js
const CONSTANTS = require("../shared/constants");

class Game {
    constructor() {
        this.players = {};
        this.bullets = []; // New array to track active bullets
        this.bulletIdCounter = 0;
        this.lastUpdateTime = Date.now();

        this.relic = { x: 0, y: 0 };
        this.spawnRelic();
        this.gameStartTime = Date.now();
        this.timeLeft = CONSTANTS.MATCH_LENGTH; // 180 seconds
        this.isGameOver = false;
    }

    spawnRelic() {
        this.relic.x = Math.random() * (CONSTANTS.WORLD_WIDTH - 30); // css
        this.relic.y = Math.random() * (CONSTANTS.WORLD_HEIGHT - 30); // css
        console.log();
    }

    addPlayer(id) {
        this.players[id] = {
            id: id,
            x: Math.random() * (CONSTANTS.WORLD_WIDTH - CONSTANTS.PLAYER_SIZE),
            y: Math.random() * (CONSTANTS.WORLD_HEIGHT - CONSTANTS.PLAYER_SIZE),
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            score: 0,
            isStunned: false,
            lastShotTime: 0, // Track cooldowns
            inputs: {
                up: false,
                down: false,
                left: false,
                right: false,
                shooting: false,
                mouseX: 0,
                mouseY: 0,
            },
        };
    }

    removePlayer(id) {
        delete this.players[id];
    }

    // Update what buttons a specific player is currently pressing
    handleInput(id, inputs) {
        if (this.players[id]) {
            this.players[id].inputs = inputs;
        }
    }

    // The core physics loop - runs 60 times a second
    update() {
        // Stop calculating physics if the game is over
        if (this.isGameOver) return this.getState();

        const now = Date.now();
        const dt = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        // --- NEW TIMER LOGIC ---
        const elapsedSeconds = Math.floor((now - this.gameStartTime) / 1000);
        this.timeLeft = Math.max(0, CONSTANTS.MATCH_LENGTH - elapsedSeconds);
        if (this.timeLeft === 0) {
            this.isGameOver = true;
        }

        // 1. UPDATE PLAYERS
        for (const id in this.players) {
            const p = this.players[id];
            if (p.isStunned) continue;

            const distance = CONSTANTS.PLAYER_SPEED * dt;
            if (p.inputs.up) p.y -= distance;
            if (p.inputs.down) p.y += distance;
            if (p.inputs.left) p.x -= distance;
            if (p.inputs.right) p.x += distance;

            p.x = Math.max(
                0,
                Math.min(p.x, CONSTANTS.WORLD_WIDTH - CONSTANTS.PLAYER_SIZE),
            );
            p.y = Math.max(
                0,
                Math.min(p.y, CONSTANTS.WORLD_HEIGHT - CONSTANTS.PLAYER_SIZE),
            );

            // --- NEW RELIC COLLISION LOGIC ---
            // AABB Collision between Player (size from constants) and Relic (30px)
            if (
                p.x < this.relic.x + 30 &&
                p.x + CONSTANTS.PLAYER_SIZE > this.relic.x &&
                p.y < this.relic.y + 30 &&
                p.y + CONSTANTS.PLAYER_SIZE > this.relic.y
            ) {
                p.score += 5; // 5 points for grabbing the relic!
                this.spawnRelic(); // Instantly move it somewhere else
            }

            // SHOOTING LOGIC
            if (
                p.inputs.shooting &&
                now - p.lastShotTime > CONSTANTS.FIRE_COOLDOWN
            ) {
                p.lastShotTime = now;

                // Calculate the angle from player center to mouse cursor
                // (Note: In a real environment we'd convert screen coordinates to virtual coordinates,
                // but for simplicity right now we assume 1:1 screen mapping)
                const playerCenterX = p.x + CONSTANTS.PLAYER_SIZE / 2;
                const playerCenterY = p.y + CONSTANTS.PLAYER_SIZE / 2;
                const angle = Math.atan2(
                    p.inputs.mouseY - playerCenterY,
                    p.inputs.mouseX - playerCenterX,
                );

                this.bullets.push({
                    id: this.bulletIdCounter++,
                    ownerId: p.id,
                    x: playerCenterX,
                    y: playerCenterY,
                    velocityX: Math.cos(angle) * CONSTANTS.BULLET_SPEED,
                    velocityY: Math.sin(angle) * CONSTANTS.BULLET_SPEED,
                });
            }
        }

        // 2. UPDATE BULLETS & CHECK COLLISIONS
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.velocityX * dt;
            b.y += b.velocityY * dt;

            // Check if bullet hit a wall (remove it)
            if (
                b.x < 0 ||
                b.x > CONSTANTS.WORLD_WIDTH ||
                b.y < 0 ||
                b.y > CONSTANTS.WORLD_HEIGHT
            ) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Check if bullet hit a player (AABB Collision)
            for (const targetId in this.players) {
                const target = this.players[targetId];
                if (b.ownerId === targetId || target.isStunned) continue; // Can't shoot yourself or stunned players

                if (
                    b.x > target.x &&
                    b.x < target.x + CONSTANTS.PLAYER_SIZE &&
                    b.y > target.y &&
                    b.y < target.y + CONSTANTS.PLAYER_SIZE
                ) {
                    // Hit!
                    target.isStunned = true;
                    target.color = "#555555"; // Turn gray when stunned

                    // Award points to the shooter
                    if (this.players[b.ownerId]) {
                        this.players[b.ownerId].score += 1;
                    }

                    // Unstun after 3 seconds
                    setTimeout(() => {
                        if (this.players[targetId]) {
                            target.isStunned = false;
                            target.color = `hsl(${Math.random() * 360}, 100%, 50%)`; // New color
                            target.x =
                                Math.random() *
                                (CONSTANTS.WORLD_WIDTH - CONSTANTS.PLAYER_SIZE); // Respawn
                            target.y =
                                Math.random() *
                                (CONSTANTS.WORLD_HEIGHT -
                                    CONSTANTS.PLAYER_SIZE);
                        }
                    }, 3000);

                    this.bullets.splice(i, 1); // Destroy bullet
                    break;
                }
            }
        }

        return this.getState();
    }

    getState() {
        return {
            players: this.players,
            bullets: this.bullets, // Now we send bullets to the client!
        };
    }

    // Package the world state for broadcasting
    getState() {
        console.log(this.relic);
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
