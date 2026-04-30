// server/game.js
const CONSTANTS = require("../shared/constants");

class Game {
    constructor() {
        this.players = {};
        this.bullets = []; // New array to track active bullets
        this.bulletIdCounter = 0;
        this.lastUpdateTime = Date.now();
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
            // Add this temporary log:
            if (inputs.shooting) {
                console.log(
                    `[SERVER RECEIVE] Player ${id} is trying to shoot! Mouse: ${inputs.mouseX}, ${inputs.mouseY}`,
                );
            }
        }
    }

    // The core physics loop - runs 60 times a second
    update() {
        const now = Date.now();
        const dt = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        // 1. UPDATE PLAYERS
        for (const id in this.players) {
            const p = this.players[id];
            if (p.isStunned) continue; // Stunned players can't move or shoot

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
                console.log(
                    `[SERVER PHYSICS] Bullet Spawned! Total bullets active: ${this.bullets.length}`,
                );
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
        return {
            players: this.players,
            // We will add bullets and the relic here later
        };
    }
}

module.exports = Game;
