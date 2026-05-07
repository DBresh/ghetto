const Player = require("./player");
const CONSTANTS = require("../shared/constants");

class NPC extends Player {
    constructor(id, startX, startY) {
        super(id, startX, startY, "Bot-" + Math.floor(Math.random() * 999));
        this.visionRange = 1000;

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
        this.jukeTimer = 0;

        this.combatStrafeDir = Math.random() > 0.5 ? 1 : -1;
        this.combatStrafeTimer = 0;

        this.inputs.mouseX = startX + 100;
        this.inputs.mouseY = startY;

        this.avoidanceTimer = 0;
        this.avoidanceAngle = 0;
        this.avoidanceDrive = 1;
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
            enemyHasLoS: false,
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

            if (dist < this.visionRange) {
                if (dist < perception.nearestEnemyDist) {
                    perception.nearestEnemyDist = dist;
                    perception.nearestEnemy = p;
                    perception.enemyHasLoS = this.hasLineOfSight(game, pCX, pCY);
                }
            }
        }

        // Scan PowerUps
        for (const pu of game.powerUps) {
            const puCX = pu.x + CONSTANTS.POWERUP_SIZE / 2;
            const puCY = pu.y + CONSTANTS.POWERUP_SIZE / 2;
            const dist = Math.hypot(puCX - myCX, puCY - myCY);

            if (dist < 1200) {
                if (dist < perception.nearestPowerUpDist) {
                    perception.nearestPowerUpDist = dist;
                    perception.nearestPowerUp = pu;
                }
            }
        }

        return perception;
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

            if (checkX < 0 || checkX > CONSTANTS.WORLD_WIDTH || checkY < 0 || checkY > CONSTANTS.WORLD_HEIGHT) {
                return false;
            }

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

    decide(perception, now, game) {
        const { nearestEnemy, nearestEnemyDist, enemyHasLoS, nearestPowerUp } = perception;
        const myCX = this.x + CONSTANTS.PLAYER_WIDTH / 2;
        const myCY = this.y + CONSTANTS.PLAYER_HEIGHT / 2;

        let decision;

        if (nearestEnemy && this.hp <= 40 && nearestEnemyDist < 800) {
            decision = this.handleFlee(nearestEnemy, myCX, myCY, enemyHasLoS);
        } else if (nearestEnemy) {
            decision = this.handleAttack(nearestEnemy, nearestEnemyDist, myCX, myCY, now, enemyHasLoS);
        } else if (nearestPowerUp) {
            decision = this.handlePursueRelic(nearestPowerUp, myCX, myCY);
        } else {
            decision = this.handleWander(now, myCX, myCY);
        }

        if (decision.drive !== 0) {
            if (now < this.avoidanceTimer) {
                decision.targetAngle = this.avoidanceAngle;
                decision.drive = this.avoidanceDrive;
            } else {
                const moveAngle = decision.drive === 1 ? decision.targetAngle : decision.targetAngle + Math.PI;
                const lookAhead = 100;

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

                    if (!pathFound) {
                        decision.drive *= -1;
                    }

                    this.avoidanceAngle = decision.targetAngle;
                    this.avoidanceDrive = decision.drive;
                    this.avoidanceTimer = now + 250;
                }
            }
        }

        return decision;
    }

    handleFlee(nearestEnemy, myCX, myCY, enemyHasLoS) {
        this.state = "FLEE";
        const enemyCX = nearestEnemy.x + CONSTANTS.PLAYER_WIDTH / 2;
        const enemyCY = nearestEnemy.y + CONSTANTS.PLAYER_HEIGHT / 2;

        this.inputs.mouseX = enemyCX;
        this.inputs.mouseY = enemyCY;

        this.clickToggle = !this.clickToggle;
        this.inputs.shooting = enemyHasLoS ? this.clickToggle : false;

        const angleToEnemy = Math.atan2(enemyCY - myCY, enemyCX - myCX);
        let angleDiff = angleToEnemy - this.baseAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

        if (Math.abs(angleDiff) < Math.PI / 2) {
            return { targetAngle: angleToEnemy, drive: -1 };
        } else {
            return { targetAngle: angleToEnemy + Math.PI, drive: 1 };
        }
    }

    handleAttack(nearestEnemy, nearestEnemyDist, myCX, myCY, now, enemyHasLoS) {
        this.state = "ATTACK";
        const enemyCX = nearestEnemy.x + CONSTANTS.PLAYER_WIDTH / 2;
        const enemyCY = nearestEnemy.y + CONSTANTS.PLAYER_HEIGHT / 2;

        this.inputs.mouseX = enemyCX;
        this.inputs.mouseY = enemyCY;

        this.clickToggle = !this.clickToggle;
        this.inputs.shooting = enemyHasLoS ? this.clickToggle : false;

        if (now > this.combatStrafeTimer) {
            this.combatStrafeDir *= -1;
            this.combatStrafeTimer = now + 500 + Math.random() * 1500;
        }

        const angleToEnemy = Math.atan2(enemyCY - myCY, enemyCX - myCX);
        let targetAngle;
        let drive = 0;

        if (nearestEnemyDist > 300 || !enemyHasLoS) {
            targetAngle = angleToEnemy + 0.5 * this.combatStrafeDir;
            drive = 1;
        } else if (nearestEnemyDist < 150) {
            targetAngle = angleToEnemy + 0.5 * this.combatStrafeDir;
            drive = -1;
        } else {
            targetAngle = angleToEnemy + 1.3 * this.combatStrafeDir;

            if (now > this.jukeTimer) {
                this._juke = this._juke === 1 ? -1 : 1;
                this.jukeTimer = now + 400 + Math.random() * 800;
            }
            drive = this._juke;

            if (nearestEnemyDist > 270 && drive === -1) drive = 1;
            if (nearestEnemyDist < 180 && drive === 1) drive = -1;
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

        return {
            targetAngle: Math.atan2(puCY - myCY, puCX - myCX),
            drive: 1,
        };
    }

    handleWander(now, myCX, myCY) {
        this.state = "WANDER";

        if (now > this.nextDecisionTime) {
            this.nextDecisionTime = now + 1000 + Math.random() * 2000;
            this._wanderAngle = this.baseAngle + (Math.random() - 0.5) * Math.PI;
            this._wanderMove = Math.random() > 0.2;
        }

        return {
            targetAngle: this._wanderAngle,
            drive: this._wanderMove ? 1 : 0,
        };
    }

    execute(decision, now) {
        let angleDiff = decision.targetAngle - this.baseAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

        if (angleDiff > 0.1) this.inputs.right = true;
        else if (angleDiff < -0.1) this.inputs.left = true;

        if (decision.drive === 1) {
            if (Math.abs(angleDiff) < 0.8) {
                this.inputs.up = true;
            }
        } else if (decision.drive === -1) {
            this.inputs.down = true;
        }

        // Anti-Stuck
        if (now > this.stuckTimer) {
            const movedDist = Math.hypot(this.x - this.lastX, this.y - this.lastY);
            if (movedDist < 5 && (this.inputs.up || this.inputs.down)) {
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
        const decision = this.decide(perception, now, game);
        this.execute(decision, now);

        super.update(dt, game, now);
    }
}

module.exports = NPC;
