const CONSTANTS = require("../shared/constants");
const Player = require("./player");
const Projectile = require("./projectile");
const NPC = require("./npc");

class Game {
    constructor() {
        this.mapGrid = [];
        this.buildMap();

        this.players = {};
        this.bullets = [];
        this.bulletIdCounter = 0;
        this.lastUpdateTime = Date.now();
        this.events = [];

        this.powerUps = [];
        for (let i = 0; i < CONSTANTS.MAX_POWERUPS; i++) {
            this.spawnPowerUp();
        }

        this.gameStartTime = Date.now();
        this.timeLeft = CONSTANTS.MATCH_LENGTH;
        this.isGameOver = false;
        this.isPaused = false;
        this.pausedBy = null;

        this.botIdCounter = 0;
    }

    buildMap() {
        const blueprint = CONSTANTS.CLASSIC_MAP;
        for (let r = 0; r < blueprint.length; r++) {
            this.mapGrid[r] = [];
            for (let c = 0; c < blueprint[r].length; c++) {
                this.mapGrid[r][c] = blueprint[r][c];
            }
        }
    }

    checkWallCollision(x, y, width, height) {
        const startCol = Math.floor(x / CONSTANTS.TILE_SIZE);
        const endCol = Math.floor((x + width - 0.1) / CONSTANTS.TILE_SIZE);
        const startRow = Math.floor(y / CONSTANTS.TILE_SIZE);
        const endRow = Math.floor((y + height - 0.1) / CONSTANTS.TILE_SIZE);

        if (startCol < 0 || endCol >= this.mapGrid[0].length || startRow < 0 || endRow >= this.mapGrid.length) {
            return true;
        }

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const tile = this.mapGrid[r][c];
                if (tile === "B" || tile === "S") {
                    return true;
                }
            }
        }
        return false;
    }

    spawnPowerUp() {
        const pos = this.getSafePosition(CONSTANTS.POWERUP_SIZE, CONSTANTS.POWERUP_SIZE);
        const types = CONSTANTS.POWERUP_TYPES;

        this.powerUps.push({
            id: Math.random().toString(36).substring(2, 9),
            type: types[Math.floor(Math.random() * types.length)],
            x: pos.x,
            y: pos.y,
        });
    }

    addPlayer(id, name) {
        const pos = this.getSafePosition(CONSTANTS.PLAYER_WIDTH, CONSTANTS.PLAYER_HEIGHT);
        this.players[id] = new Player(id, pos.x, pos.y, name);
        this.manageBots();
    }

    removePlayer(id) {
        delete this.players[id];
        if (this.pausedBy === id) {
            this.isPaused = false;
            this.pausedBy = null;
        }
        this.manageBots();
    }

    manageBots() {
        const realPlayerIds = Object.keys(this.players).filter((id) => !id.startsWith("BOT_"));
        const currentBotIds = Object.keys(this.players).filter((id) => id.startsWith("BOT_"));

        const desiredBotCount = Math.max(0, 4 - realPlayerIds.length);

        while (currentBotIds.length < desiredBotCount) {
            this.botIdCounter++;
            const botId = "BOT_" + this.botIdCounter;
            const pos = this.getSafePosition(CONSTANTS.PLAYER_WIDTH, CONSTANTS.PLAYER_HEIGHT);

            this.players[botId] = new NPC(botId, pos.x, pos.y);
            currentBotIds.push(botId);
        }

        while (currentBotIds.length > desiredBotCount) {
            const botToRemove = currentBotIds.pop();
            delete this.players[botToRemove];
        }
    }

    handleInput(id, inputs) {
        if (this.players[id]) this.players[id].inputs = inputs;
    }

    update() {
        if (this.isPaused || this.isGameOver) {
            this.lastUpdateTime = Date.now();
            return this.getState();
        }

        const now = Date.now();
        const dt = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.isGameOver = true;
            return this.getState();
        }

        this.updatePlayers(dt, now);
        this.updateBulletsAndCollisions(dt);

        return this.getState();
    }

    restart() {
        this.lastUpdateTime = Date.now();
        this.timeLeft = CONSTANTS.MATCH_LENGTH || 120;

        this.isGameOver = false;
        this.isPaused = false;
        this.pausedBy = null;

        this.bullets = [];

        this.powerUps = [];
        for (let i = 0; i < CONSTANTS.MAX_POWERUPS; i++) {
            this.spawnPowerUp();
        }

        for (const id in this.players) {
            const p = this.players[id];
            p.score = 0;
            if (p.clearBuffs) p.clearBuffs();
            const safePos = this.getSafePosition(CONSTANTS.PLAYER_WIDTH, CONSTANTS.PLAYER_HEIGHT);
            p.respawn(safePos.x, safePos.y);
        }
    }

    getSafePosition(entityWidth, entityHeight) {
        let x, y, isSafe;
        let attempts = 0;

        do {
            x = Math.random() * (CONSTANTS.WORLD_WIDTH - entityWidth);
            y = Math.random() * (CONSTANTS.WORLD_HEIGHT - entityHeight);

            isSafe = !this.checkWallCollision(x, y, entityWidth, entityHeight);

            attempts++;
        } while (!isSafe && attempts < 100);

        if (!isSafe) {
            x = 0;
            y = 0;
        }

        return { x, y };
    }

    updatePlayers(dt, now) {
        for (const id in this.players) {
            const p = this.players[id];
            if (typeof p.updateAI === "function") {
                p.updateAI(dt, this, now);
            } else {
                p.update(dt, this, now);
            }

            for (let i = this.powerUps.length - 1; i >= 0; i--) {
                const pu = this.powerUps[i];
                if (
                    p.x < pu.x + CONSTANTS.POWERUP_SIZE &&
                    p.x + CONSTANTS.PLAYER_WIDTH > pu.x &&
                    p.y < pu.y + CONSTANTS.POWERUP_SIZE &&
                    p.y + CONSTANTS.PLAYER_HEIGHT > pu.y
                ) {
                    switch (pu.type) {
                        case "RELIC":
                            p.score += 5;
                            p.heal(CONSTANTS.HEAL_AMOUNT);
                            break;
                        case "SPEED":
                            p.clearBuffs();
                            p.speedTimer = now + CONSTANTS.BUFF_DURATION;
                            break;
                        case "DOUBLE_BARREL":
                            p.clearBuffs();
                            p.doubleBarrelTimer = now + CONSTANTS.BUFF_DURATION;
                            break;
                        case "SHIELD":
                            p.clearBuffs();
                            p.shieldCharges = CONSTANTS.SHIELD_CHARGES;
                            break;
                    }

                    this.powerUps.splice(i, 1);
                    this.spawnPowerUp();
                }
            }

            if (p.canShoot(now)) {
                p.lastShotTime = now;
                const pCX = p.x + CONSTANTS.PLAYER_WIDTH / 2;
                const pCY = p.y + CONSTANTS.PLAYER_HEIGHT / 2;

                if (p.hasDoubleBarrel) {
                    const offset = 10;
                    const perpAngle = p.turretAngle + Math.PI / 2;
                    const offsetX = Math.cos(perpAngle) * offset;
                    const offsetY = Math.sin(perpAngle) * offset;

                    this.bullets.push(
                        new Projectile(this.bulletIdCounter++, p.id, pCX + offsetX, pCY + offsetY, p.turretAngle),
                    );
                    this.bullets.push(
                        new Projectile(this.bulletIdCounter++, p.id, pCX - offsetX, pCY - offsetY, p.turretAngle),
                    );
                } else {
                    this.bullets.push(new Projectile(this.bulletIdCounter++, p.id, pCX, pCY, p.turretAngle));
                }
            }
        }
    }

    updateBulletsAndCollisions(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(dt);

            const bSize = CONSTANTS.BULLET_SIZE || 8;

            if (
                b.x < 0 ||
                b.x + bSize > CONSTANTS.WORLD_WIDTH ||
                b.y < 0 ||
                b.y + bSize > CONSTANTS.WORLD_HEIGHT ||
                this.checkWallCollision(b.x, b.y, bSize, bSize)
            ) {
                this.bullets.splice(i, 1);
                continue;
            }

            for (const targetId in this.players) {
                if (targetId === b.ownerId) continue;

                const target = this.players[targetId];
                if (b.hitsPlayer(target)) {
                    const wasKilled = target.takeDamage(CONSTANTS.BULLET_DAMAGE);
                    if (wasKilled) {
                        if (this.players[b.ownerId]) {
                            this.players[b.ownerId].score += 1;
                            this.events.push({
                                killerColor: this.players[b.ownerId].color,
                                killerName: this.players[b.ownerId].name,
                                victimColor: target.color,
                                victimName: target.name,
                            });
                        }

                        const safePos = this.getSafePosition(CONSTANTS.PLAYER_WIDTH, CONSTANTS.PLAYER_HEIGHT);
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
            powerUps: this.powerUps,
            timeLeft: this.timeLeft,
            isGameOver: this.isGameOver,
        };
    }
}

module.exports = Game;
