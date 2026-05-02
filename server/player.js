const CONSTANTS = require("../shared/constants");

class Player {
    constructor(id) {
        this.id = id;
        this.x =
            Math.random() * (CONSTANTS.WORLD_WIDTH - CONSTANTS.PLAYER_SIZE);
        this.y =
            Math.random() * (CONSTANTS.WORLD_HEIGHT - CONSTANTS.PLAYER_SIZE);
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
    }

    update(dt) {
        this.isFreshClick = this.inputs.shooting && !this.wasShooting;
        this.wasShooting = this.inputs.shooting;

        // 1. Tank Chassis Rotation (A and D keys)
        if (this.inputs.left)
            this.baseAngle -= CONSTANTS.TANK_ROTATION_SPEED * dt;
        if (this.inputs.right)
            this.baseAngle += CONSTANTS.TANK_ROTATION_SPEED * dt;

        // 2. Tank Forward/Backward Movement (W and S keys)
        const speed = CONSTANTS.PLAYER_SPEED * dt;
        if (this.inputs.up) {
            this.x += Math.cos(this.baseAngle) * speed;
            this.y += Math.sin(this.baseAngle) * speed;
        }
        if (this.inputs.down) {
            this.x -= Math.cos(this.baseAngle) * speed;
            this.y -= Math.sin(this.baseAngle) * speed;
        }

        // 3. Turret Rotation (Aim at mouse)
        const centerX = this.x + CONSTANTS.PLAYER_SIZE / 2;
        const centerY = this.y + CONSTANTS.PLAYER_SIZE / 2;
        this.turretAngle = Math.atan2(
            this.inputs.mouseY - centerY,
            this.inputs.mouseX - centerX,
        );

        // Clamp to virtual bounds[cite: 4]
        this.x = Math.max(
            0,
            Math.min(this.x, CONSTANTS.WORLD_WIDTH - CONSTANTS.PLAYER_SIZE),
        );
        this.y = Math.max(
            0,
            Math.min(this.y, CONSTANTS.WORLD_HEIGHT - CONSTANTS.PLAYER_SIZE),
        );
    }

    canShoot(now) {
        return (
            this.isFreshClick &&
            now - this.lastShotTime > CONSTANTS.FIRE_COOLDOWN
        );
    }

    // Replace stun() with this:
    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.respawn();
            return true; // Returns true if the tank was destroyed
        }
        return false;
    }

    respawn() {
        this.hp = CONSTANTS.MAX_HP;
        // Teleport to a new random location
        this.x =
            Math.random() * (CONSTANTS.WORLD_WIDTH - CONSTANTS.PLAYER_SIZE);
        this.y =
            Math.random() * (CONSTANTS.WORLD_HEIGHT - CONSTANTS.PLAYER_SIZE);
    }
}

module.exports = Player;
