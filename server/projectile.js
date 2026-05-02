const CONSTANTS = require("../shared/constants");

class Projectile {
    constructor(id, ownerId, startX, startY, angle) {
        this.id = id;
        this.ownerId = ownerId;
        this.x = startX;
        this.y = startY;
        this.velocityX = Math.cos(angle) * CONSTANTS.BULLET_SPEED;
        this.velocityY = Math.sin(angle) * CONSTANTS.BULLET_SPEED;
    }

    update(dt) {
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;
    }

    isOutOfBounds() {
        return (
            this.x < 0 ||
            this.x > CONSTANTS.WORLD_WIDTH ||
            this.y < 0 ||
            this.y > CONSTANTS.WORLD_HEIGHT
        );
    }

    hitsPlayer(player) {
        if (this.ownerId === player.id || player.isStunned) return false;

        return (
            this.x > player.x &&
            this.x < player.x + CONSTANTS.PLAYER_SIZE &&
            this.y > player.y &&
            this.y < player.y + CONSTANTS.PLAYER_SIZE
        );
    }
}

module.exports = Projectile;
