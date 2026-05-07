const Player = require("./player");
const CONSTANTS = require("../shared/constants");

class NPC extends Player {
    constructor(id, startX, startY) {
        super(id, startX, startY, "Bot-" + Math.floor(Math.random() * 999));

        this.state = "WANDER";
        this.targetId = null;
        this.visionRange = 400;

        this.nextDecisionTime = 0;
        this.stuckTimer = 0;
        this.lastX = startX;
        this.lastY = startY;
    }

    updateAI(dt, game, now) {
        let nearestEnemy = null;
        let nearestEnemyDist = Infinity;

        let nearestPowerUp = null;
        let nearestPowerUpDist = Infinity;

        const myCX = this.x + CONSTANTS.PLAYER_WIDTH / 2;
        const myCY = this.y + CONSTANTS.PLAYER_HEIGHT / 2;

        // Scan for enemies
        for (const pid in game.players) {
            const p = game.players[pid];
            if (p.id === this.id || p.hp <= 0) continue;

            const pCX = p.x + CONSTANTS.PLAYER_WIDTH / 2;
            const pCY = p.y + CONSTANTS.PLAYER_HEIGHT / 2;
            const dist = Math.hypot(pCX - myCX, pCY - myCY);

            if (dist < 600 && this.hasLineOfSight(game, pCX, pCY)) {
                if (dist < nearestEnemyDist) {
                    nearestEnemyDist = dist;
                    nearestEnemy = p;
                }
            }
        }

        // Scan for PowerUps
        for (const pu of game.powerUps) {
            const puCX = pu.x + CONSTANTS.POWERUP_SIZE / 2;
            const puCY = pu.y + CONSTANTS.POWERUP_SIZE / 2;
            const dist = Math.hypot(puCX - myCX, puCY - myCY);

            if (dist < 800 && this.hasLineOfSight(game, puCX, puCY)) {
                if (dist < nearestPowerUpDist) {
                    nearestPowerUpDist = dist;
                    nearestPowerUp = pu;
                }
            }
        }

        // Reset inputs
        this.inputs.up = false;
        this.inputs.down = false;
        this.inputs.left = false;
        this.inputs.right = false;
        this.inputs.shooting = false;

        let targetAngle = this.baseAngle;
        let shouldMoveForward = false;

        if (nearestEnemy && this.hp <= 34 && nearestEnemyDist < 300) {
            this.state = "FLEE";
            const enemyCX = nearestEnemy.x + CONSTANTS.PLAYER_WIDTH / 2;
            const enemyCY = nearestEnemy.y + CONSTANTS.PLAYER_HEIGHT / 2;

            // Aim Turret at enemy to shoot while running away
            this.inputs.mouseX = enemyCX;
            this.inputs.mouseY = enemyCY;
            this.inputs.shooting = true;

            // Drive in the exact opposite direction of the enemy
            targetAngle = Math.atan2(myCY - enemyCY, myCX - enemyCX);
            shouldMoveForward = true;
        } else if (nearestEnemy) {
            this.state = "ATTACK";
            const enemyCX = nearestEnemy.x + CONSTANTS.PLAYER_WIDTH / 2;
            const enemyCY = nearestEnemy.y + CONSTANTS.PLAYER_HEIGHT / 2;

            this.inputs.mouseX = enemyCX;
            this.inputs.mouseY = enemyCY;
            this.inputs.shooting = true;

            targetAngle = Math.atan2(enemyCY - myCY, enemyCX - myCX);

            if (nearestEnemyDist > 200) {
                shouldMoveForward = true;
            }
        } else if (nearestPowerUp) {
            this.state = "PURSUE_RELIC";
            const puCX = nearestPowerUp.x + CONSTANTS.POWERUP_SIZE / 2;
            const puCY = nearestPowerUp.y + CONSTANTS.POWERUP_SIZE / 2;

            this.inputs.mouseX = myCX + Math.cos(this.baseAngle) * 100;
            this.inputs.mouseY = myCY + Math.sin(this.baseAngle) * 100;

            targetAngle = Math.atan2(puCY - myCY, puCX - myCX);
            shouldMoveForward = true;
        } else {
            this.state = "WANDER";

            if (now > this.nextDecisionTime) {
                this.nextDecisionTime = now + 1000 + Math.random() * 2000;
                this._wanderAngle = this.baseAngle + (Math.random() - 0.5) * Math.PI; // Pick a random direction forwardish
                this._wanderMove = Math.random() > 0.2; // 80% chance to move
            }

            targetAngle = this._wanderAngle;
            shouldMoveForward = this._wanderMove;

            // Look forward
            this.inputs.mouseX = myCX + Math.cos(this.baseAngle) * 100;
            this.inputs.mouseY = myCY + Math.sin(this.baseAngle) * 100;
        }

        // Calculate the shortest turn to face our target angle
        let angleDiff = targetAngle - this.baseAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)); // Normalize between -PI and PI

        // If we need to turn, press left or right
        if (angleDiff > 0.1) this.inputs.right = true;
        else if (angleDiff < -0.1) this.inputs.left = true;

        // If we are facing generally the right way, hit the gas
        if (Math.abs(angleDiff) < 0.5 && shouldMoveForward) {
            this.inputs.up = true;
        }

        // wall detection
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

        super.update(dt, game, now);
    }

    hasLineOfSight(game, targetX, targetY) {
        const myCX = this.x + CONSTANTS.PLAYER_WIDTH / 2;
        const myCY = this.y + CONSTANTS.PLAYER_HEIGHT / 2;

        const dist = Math.hypot(targetX - myCX, targetY - myCY);
        // Step size of 20 pixels is small enough to not jump over walls, but large enough to be fast
        const steps = dist / 20;

        const dx = (targetX - myCX) / steps;
        const dy = (targetY - myCY) / steps;

        let checkX = myCX;
        let checkY = myCY;

        for (let i = 0; i < steps; i++) {
            // Check a tiny 2x2 box along the line
            if (game.checkWallCollision(checkX, checkY, 2, 2)) {
                return false; // Wall hit!
            }
            checkX += dx;
            checkY += dy;
        }
        return true; // Clear path!
    }
}

module.exports = NPC;
