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
    }

    update(dt) {
        if (this.isStunned) return;

        const distance = CONSTANTS.PLAYER_SPEED * dt;
        if (this.inputs.up) this.y -= distance;
        if (this.inputs.down) this.y += distance;
        if (this.inputs.left) this.x -= distance;
        if (this.inputs.right) this.x += distance;

        // Clamp to virtual bounds
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
            !this.isStunned &&
            this.inputs.shooting &&
            now - this.lastShotTime > CONSTANTS.FIRE_COOLDOWN
        );
    }

    stun() {
        this.isStunned = true;
        this.color = "#555555";

        setTimeout(() => {
            this.isStunned = false;
            this.color = `hsl(${Math.random() * 360}, 100%, 50%)`; // New color
            this.x =
                Math.random() * (CONSTANTS.WORLD_WIDTH - CONSTANTS.PLAYER_SIZE);
            this.y =
                Math.random() *
                (CONSTANTS.WORLD_HEIGHT - CONSTANTS.PLAYER_SIZE);
        }, 3000);
    }
}

module.exports = Player;
