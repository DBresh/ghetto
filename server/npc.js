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

        this.clickToggle = false;
        this._juke = 1;

        this.combatStrafeDir = Math.random() > 0.5 ? 1 : -1;
        this.combatStrafeTimer = 0;
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

    decide(perception, now, game) {
        const { nearestEnemy, nearestEnemyDist, nearestPowerUp } = perception;
        const myCX = this.x + CONSTANTS.PLAYER_WIDTH / 2;
        const myCY = this.y + CONSTANTS.PLAYER_HEIGHT / 2;

        let decision;

        if (nearestEnemy && this.hp <= 34 && nearestEnemyDist < 300) {
            decision = this.handleFlee(nearestEnemy, myCX, myCY);
        } else if (nearestEnemy) {
            // Pass 'now' to handleAttack for the timer!
            decision = this.handleAttack(nearestEnemy, nearestEnemyDist, myCX, myCY, now);
        } else if (nearestPowerUp) {
            decision = this.handlePursueRelic(nearestPowerUp, myCX, myCY);
        } else {
            decision = this.handleWander(now, myCX, myCY);
        }

        // TRUE OBSTACLE AVOIDANCE (Whiskers)
        if (decision.drive !== 0) {
            const moveAngle = decision.drive === 1 ? decision.targetAngle : decision.targetAngle + Math.PI;
            const lookAhead = 100; // Slightly shorter look ahead

            if (!this.isPathClear(game, myCX, myCY, moveAngle, lookAhead)) {
                const angleOffsets = [0.5, -0.5, 1.0, -1.0, 1.5, -1.5, 2.0, -2.0];
                let pathFound = false;

                for (const offset of angleOffsets) {
                    const testAngle = moveAngle + offset;
                    if (this.isPathClear(game, myCX, myCY, testAngle, lookAhead)) {
                        decision.targetAngle = decision.drive === 1 ? testAngle : testAngle - Math.PI;
                        pathFound = true;
                        break;
                    }
                }

                // PANIC MODE: If completely boxed in, force it into reverse
                if (!pathFound) {
                    decision.drive *= -1;
                }
            }
        }

        return decision;
    }

    isPathClear(game, startX, startY, angle, distance) {
        const steps = distance / 20;
        const dx = Math.cos(angle) * 20;
        const dy = Math.sin(angle) * 20;

        let checkX = startX;
        let checkY = startY;

        for (let i = 0; i < steps; i++) {
            checkX += dx;
            checkY += dy;

            // 1. Check World Bounds
            if (checkX < 0 || checkX > CONSTANTS.WORLD_WIDTH || checkY < 0 || checkY > CONSTANTS.WORLD_HEIGHT) {
                return false;
            }

            // 2. Check Grid Walls with a smaller "feeler" radius (15px)
            // This prevents them from clipping corners and panicking
            const feelerRadius = 15;
            if (
                game.checkWallCollision(
                    checkX - feelerRadius,
                    checkY - feelerRadius,
                    feelerRadius * 2,
                    feelerRadius * 2,
                )
            ) {
                return false;
            }
        }
        return true;
    }

    handleFlee(nearestEnemy, myCX, myCY) {
        this.state = "FLEE";
        const enemyCX = nearestEnemy.x + CONSTANTS.PLAYER_WIDTH / 2;
        const enemyCY = nearestEnemy.y + CONSTANTS.PLAYER_HEIGHT / 2;

        this.inputs.mouseX = enemyCX;
        this.inputs.mouseY = enemyCY;

        // Auto-clicker: Spams true/false every single tick so it fires instantly when ready
        this.clickToggle = !this.clickToggle;
        this.inputs.shooting = this.clickToggle;

        const angleToEnemy = Math.atan2(enemyCY - myCY, enemyCX - myCX);

        // Calculate if enemy is in front of or behind us
        let angleDiff = angleToEnemy - this.baseAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

        // If the enemy is roughly in front of us, put it in reverse!
        // (Turning 180 degrees takes too long and we will die)
        if (Math.abs(angleDiff) < Math.PI / 2) {
            return {
                targetAngle: angleToEnemy, // Keep facing them
                drive: -1, // REVERSE
            };
        } else {
            return {
                targetAngle: angleToEnemy + Math.PI, // Keep facing away
                drive: 1, // DRIVE FORWARD
            };
        }
    }

    handleAttack(nearestEnemy, nearestEnemyDist, myCX, myCY, now) {
        this.state = "ATTACK";
        const enemyCX = nearestEnemy.x + CONSTANTS.PLAYER_WIDTH / 2;
        const enemyCY = nearestEnemy.y + CONSTANTS.PLAYER_HEIGHT / 2;

        this.inputs.mouseX = enemyCX;
        this.inputs.mouseY = enemyCY;

        // Auto-clicker
        this.clickToggle = !this.clickToggle;
        this.inputs.shooting = this.clickToggle;

        // Change weave direction periodically (every 0.5 to 2 seconds)
        if (now > this.combatStrafeTimer) {
            this.combatStrafeDir *= -1;
            this.combatStrafeTimer = now + 500 + Math.random() * 1500;
        }

        const angleToEnemy = Math.atan2(enemyCY - myCY, enemyCX - myCX);
        let targetAngle;
        let drive = 0;

        if (nearestEnemyDist > 300) {
            // Far: Drive closer, but zig-zag (offset by ~30 degrees)
            targetAngle = angleToEnemy + 0.5 * this.combatStrafeDir;
            drive = 1;
        } else if (nearestEnemyDist < 150) {
            // Too close: Back away diagonally (offset by ~30 degrees)
            // Reversing while angled means they slide backward AND sideways out of your crosshairs!
            targetAngle = angleToEnemy + 0.5 * this.combatStrafeDir;
            drive = -1;
        } else {
            // Sweet spot: ORBIT the player (offset by ~75 degrees)
            targetAngle = angleToEnemy + 1.3 * this.combatStrafeDir;

            if (Math.random() < 0.03) {
                this._juke = this._juke === 1 ? -1 : 1;
            }
            drive = this._juke;
        }

        return {
            targetAngle: targetAngle,
            drive: drive,
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
            drive: 1, // Standardized to use 'drive'
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
            drive: this._wanderMove ? 1 : 0, // Standardized to use 'drive'
        };
    }

    execute(decision, now) {
        let angleDiff = decision.targetAngle - this.baseAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

        // Tank Rotation
        if (angleDiff > 0.1) this.inputs.right = true;
        else if (angleDiff < -0.1) this.inputs.left = true;

        // Tank Acceleration (Forward / Reverse)
        if (decision.drive === 1) {
            // Only drive forward if we are generally facing the right direction
            if (Math.abs(angleDiff) < 0.8) {
                this.inputs.up = true;
            }
        } else if (decision.drive === -1) {
            // Reverse!
            this.inputs.down = true;
        }

        // Anti-Stuck Logic (updated for reverse driving)
        if (now > this.stuckTimer) {
            const movedDist = Math.hypot(this.x - this.lastX, this.y - this.lastY);
            // If we are trying to move (up or down) but haven't actually moved
            if (movedDist < 5 && (this.inputs.up || this.inputs.down)) {
                this.nextDecisionTime = now + 1500;
                // Force a random rotation to get unstuck
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
        const decision = this.decide(perception, now, game);
        this.execute(decision, now);

        super.update(dt, game, now);
    }
}

module.exports = NPC;
