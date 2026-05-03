const CONSTANTS = require("../shared/constants");

class Player {
    constructor(id, startX, startY, name) {
        this.id = id;
        this.x = startX;
        this.y = startY;

        this.name = name || "Unknown Tank";
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.score = 0;
        this.isStunned = false;
        this.lastShotTime = 0;
        this.inputs = {
            up: false,
            down: false,
            left: false,
            right: false,
            shooting: false,
            mouseX: 0,
            mouseY: 0,
        };

        this.hp = CONSTANTS.MAX_HP;
        this.baseAngle = 0;
        this.turretAngle = 0;

        this.shieldCharges = 0;
        this.speedTimer = 0;
        this.doubleBarrelTimer = 0;
        this.hasSpeed = false;
        this.hasDoubleBarrel = false;
    }

    update(dt, obstacles, now) {
        this.isFreshClick = this.inputs.shooting && !this.wasShooting;
        this.wasShooting = this.inputs.shooting;

        this.hasSpeed = now < this.speedTimer;
        this.hasDoubleBarrel = now < this.doubleBarrelTimer;

        if (this.inputs.left)
            this.baseAngle -= CONSTANTS.TANK_ROTATION_SPEED * dt;
        if (this.inputs.right)
            this.baseAngle += CONSTANTS.TANK_ROTATION_SPEED * dt;

        let currentSpeed = CONSTANTS.PLAYER_SPEED;
        if (this.hasSpeed) currentSpeed *= CONSTANTS.SPEED_MULTIPLIER;
        const frameSpeed = currentSpeed * dt;

        const isColliding = () => {
            return obstacles.some(
                (obs) =>
                    this.x < obs.x + obs.w &&
                    this.x + CONSTANTS.PLAYER_WIDTH > obs.x &&
                    this.y < obs.y + obs.h &&
                    this.y + CONSTANTS.PLAYER_HEIGHT > obs.y,
            );
        };

        const speed = CONSTANTS.PLAYER_SPEED * dt;
        if (this.inputs.up) {
            this.x += Math.cos(this.baseAngle) * frameSpeed;
            this.y += Math.sin(this.baseAngle) * frameSpeed;
            if (isColliding()) {
                this.x -= Math.cos(this.baseAngle) * frameSpeed;
                this.y -= Math.sin(this.baseAngle) * frameSpeed;
            }
        }

        if (this.inputs.down) {
            this.x -= Math.cos(this.baseAngle) * frameSpeed;
            this.y -= Math.sin(this.baseAngle) * frameSpeed;
            if (isColliding()) {
                this.x += Math.cos(this.baseAngle) * frameSpeed;
                this.y += Math.sin(this.baseAngle) * frameSpeed;
            }
        }

        const centerX = this.x + CONSTANTS.PLAYER_WIDTH / 2;
        const centerY = this.y + CONSTANTS.PLAYER_HEIGHT / 2;
        this.turretAngle = Math.atan2(
            this.inputs.mouseY - centerY,
            this.inputs.mouseX - centerX,
        );

        this.x = Math.max(
            0,
            Math.min(this.x, CONSTANTS.WORLD_WIDTH - CONSTANTS.PLAYER_WIDTH),
        );
        this.y = Math.max(
            0,
            Math.min(this.y, CONSTANTS.WORLD_HEIGHT - CONSTANTS.PLAYER_HEIGHT),
        );
    }

    canShoot(now) {
        return (
            this.isFreshClick &&
            now - this.lastShotTime > CONSTANTS.FIRE_COOLDOWN
        );
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, CONSTANTS.MAX_HP);
    }

    takeDamage(amount) {
        if (this.shieldCharges > 0) {
            this.shieldCharges--;
            return;
        }
        this.hp -= amount;
        if (this.hp <= 0) {
            return true;
        }
        return false;
    }

    respawn(safeX, safeY) {
        this.hp = CONSTANTS.MAX_HP;
        this.x = safeX;
        this.y = safeY;
        this.shieldCharges = 0;
        this.speedTimer = 0;
        this.doubleBarrelTimer = 0;
    }

    clearBuffs() {
        this.shieldCharges = 0;
        this.speedTimer = 0;
        this.doubleBarrelTimer = 0;

        this.hasSpeed = false;
        this.hasDoubleBarrel = false;
    }
}

module.exports = Player;
