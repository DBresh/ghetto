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

    hitsPlayer(p) {
        return (
            this.x > p.x &&
            this.x < p.x + CONSTANTS.PLAYER_WIDTH &&
            this.y > p.y &&
            this.y < p.y + CONSTANTS.PLAYER_HEIGHT
        );
    }
}

module.exports = Projectile;
