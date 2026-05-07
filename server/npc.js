const Player = require("./player");
const CONSTANTS = require("../shared/constants");

class NPC extends Player {
    constructor(id, startX, startY) {
        super(id, startX, startY, "Bot-" + Math.floor(Math.random() * 999));

        this.state = "WANDER";
        this.targetId = null;
        this.visionRange = 600;

        this.nextDecisionTime = 0;
        this.stuckTimer = 0;
        this.lastX = startX;
        this.lastY = startY;

        this._wanderAngle = 0;
        this._wanderMove = false;

        this._strafeDir = Math.random() > 0.5 ? 1 : -1;
    }

    hasLineOfSight(game, targetX, targetY) {
        const myCX = this.x + CONSTANTS.PLAYER_WIDTH / 2;
        const myCY = this.y + CONSTANTS.PLAYER_HEIGHT / 2;

        const dist = Math.hypot(targetX - myCX, targetY - myCY);
        const steps = dist / 20;

        const dx = (targetX - myCX) / steps;
        const dy = (targetY - myCY) / steps;

        let checkX = myCX;
        let checkY = myCY;

        for (let i = 0; i < steps; i++) {
            if (game.checkWallCollision(checkX, checkY, 2, 2)) return false;
            checkX += dx;
            checkY += dy;
        }
        return true;
    }

    perceive(game) {
        let perception = {
            nearestEnemy: null,
            nearestEnemyDist: Infinity,
            nearestPowerUp: null,
            nearestPowerUpDist: Infinity,
        };

        const myCX = this.x + CONSTANTS.PLAYER_WIDTH / 2;
        const myCY = this.y + CONSTANTS.PLAYER_HEIGHT / 2;

        // Scan Enemies
        for (const pid in game.players) {
            const p = game.players[pid];
            if (p.id === this.id || p.hp <= 0) continue;

            const pCX = p.x + CONSTANTS.PLAYER_WIDTH / 2;
            const pCY = p.y + CONSTANTS.PLAYER_HEIGHT / 2;
            const dist = Math.hypot(pCX - myCX, pCY - myCY);

            if (dist < this.visionRange && this.hasLineOfSight(game, pCX, pCY)) {
                if (dist < perception.nearestEnemyDist) {
                    perception.nearestEnemyDist = dist;
                    perception.nearestEnemy = p;
                }
            }
        }

        // Scan PowerUps
        for (const pu of game.powerUps) {
            const puCX = pu.x + CONSTANTS.POWERUP_SIZE / 2;
            const puCY = pu.y + CONSTANTS.POWERUP_SIZE / 2;
            const dist = Math.hypot(puCX - myCX, puCY - myCY);

            if (dist < 800 && this.hasLineOfSight(game, puCX, puCY)) {
                if (dist < perception.nearestPowerUpDist) {
                    perception.nearestPowerUpDist = dist;
                    perception.nearestPowerUp = pu;
                }
            }
        }

        return perception;
    }

    decide(perception, now) {
        const { nearestEnemy, nearestEnemyDist, nearestPowerUp } = perception;
        const myCX = this.x + CONSTANTS.PLAYER_WIDTH / 2;
        const myCY = this.y + CONSTANTS.PLAYER_HEIGHT / 2;

        if (nearestEnemy && this.hp <= 34 && nearestEnemyDist < 300) {
            return this.handleFlee(nearestEnemy, myCX, myCY, now);
        } else if (nearestEnemy) {
            return this.handleAttack(nearestEnemy, nearestEnemyDist, myCX, myCY, now);
        } else if (nearestPowerUp) {
            return this.handlePursueRelic(nearestPowerUp, myCX, myCY);
        } else {
            return this.handleWander(now, myCX, myCY);
        }
    }

    handleFlee(nearestEnemy, myCX, myCY, now) {
        this.state = "FLEE";
        const enemyCX = nearestEnemy.x + CONSTANTS.PLAYER_WIDTH / 2;
        const enemyCY = nearestEnemy.y + CONSTANTS.PLAYER_HEIGHT / 2;

        this.inputs.mouseX = enemyCX;
        this.inputs.mouseY = enemyCY;

        // Simulate "Clicking": Only hold the trigger if the gun is actually ready to fire
        this.inputs.shooting = now - this.lastShotTime >= CONSTANTS.FIRE_COOLDOWN;

        return {
            targetAngle: Math.atan2(myCY - enemyCY, myCX - enemyCX), // Exact opposite direction
            shouldMoveForward: true, // Floor it!
        };
    }

    handleAttack(nearestEnemy, nearestEnemyDist, myCX, myCY, now) {
        this.state = "ATTACK";
        const enemyCX = nearestEnemy.x + CONSTANTS.PLAYER_WIDTH / 2;
        const enemyCY = nearestEnemy.y + CONSTANTS.PLAYER_HEIGHT / 2;

        // Keep Turret locked on
        this.inputs.mouseX = enemyCX;
        this.inputs.mouseY = enemyCY;

        // Simulate "Clicking"
        this.inputs.shooting = now - this.lastShotTime >= CONSTANTS.FIRE_COOLDOWN;

        let angleToEnemy = Math.atan2(enemyCY - myCY, enemyCX - myCX);
        let targetAngle;

        // Dynamic Combat Movement
        if (nearestEnemyDist > 300) {
            // Target is far: Drive straight at them
            targetAngle = angleToEnemy;
        } else if (nearestEnemyDist < 100) {
            // Target is dangerously close: Drive backwards away from them
            targetAngle = angleToEnemy + Math.PI;
        } else {
            // Sweet spot (100-300px): Strafe / Circle the enemy!
            // We aim the base 90 degrees away from the target to drive in a circle
            targetAngle = angleToEnemy + (Math.PI / 2) * this._strafeDir;

            // Be unpredictable: 2% chance every tick to suddenly reverse strafe direction
            if (Math.random() < 0.02) {
                this._strafeDir *= -1;
            }
        }

        return {
            targetAngle: targetAngle,
            shouldMoveForward: true, // Always keep the gas pedal pushed down in combat
        };
    }

    handlePursueRelic(nearestPowerUp, myCX, myCY) {
        this.state = "PURSUE_RELIC";
        const puCX = nearestPowerUp.x + CONSTANTS.POWERUP_SIZE / 2;
        const puCY = nearestPowerUp.y + CONSTANTS.POWERUP_SIZE / 2;

        this.inputs.mouseX = myCX + Math.cos(this.baseAngle) * 100;
        this.inputs.mouseY = myCY + Math.sin(this.baseAngle) * 100;

        return {
            targetAngle: Math.atan2(puCY - myCY, puCX - myCX),
            shouldMoveForward: true,
        };
    }

    handleWander(now, myCX, myCY) {
        this.state = "WANDER";

        if (now > this.nextDecisionTime) {
            this.nextDecisionTime = now + 1000 + Math.random() * 2000;
            this._wanderAngle = this.baseAngle + (Math.random() - 0.5) * Math.PI;
            this._wanderMove = Math.random() > 0.2; // 80% chance to move
        }

        this.inputs.mouseX = myCX + Math.cos(this.baseAngle) * 100;
        this.inputs.mouseY = myCY + Math.sin(this.baseAngle) * 100;

        return {
            targetAngle: this._wanderAngle,
            shouldMoveForward: this._wanderMove,
        };
    }

    execute(decision, now) {
        let angleDiff = decision.targetAngle - this.baseAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

        if (angleDiff > 0.1) this.inputs.right = true;
        else if (angleDiff < -0.1) this.inputs.left = true;

        if (Math.abs(angleDiff) < 0.5 && decision.shouldMoveForward) {
            this.inputs.up = true;
        }

        // Anti-Stuck
        if (now > this.stuckTimer) {
            const movedDist = Math.hypot(this.x - this.lastX, this.y - this.lastY);
            if (movedDist < 5 && this.inputs.up) {
                this.nextDecisionTime = now + 1500;
                this._wanderAngle = this.baseAngle + (Math.random() > 0.5 ? 2 : -2);
            }
            this.lastX = this.x;
            this.lastY = this.y;
            this.stuckTimer = now + 250;
        }
    }

    updateAI(dt, game, now) {
        this.inputs.up = false;
        this.inputs.down = false;
        this.inputs.left = false;
        this.inputs.right = false;
        this.inputs.shooting = false;

        const perception = this.perceive(game);
        const decision = this.decide(perception, now);
        this.execute(decision, now);

        super.update(dt, game, now);
    }
}

module.exports = NPC;
