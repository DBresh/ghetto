// shared/constants.js
const CONSTANTS = {
    // Virtual World Dimensions
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 1500,

    // Player Physics (Virtual Units)
    PLAYER_SIZE: 40,
    PLAYER_SPEED: 500,
    TANK_ROTATION_SPEED: 3.5, // Radians per second

    // Projectile Physics
    BULLET_SIZE: 10,
    BULLET_SPEED: 800, // units per second
    FIRE_COOLDOWN: 1000, // ms between shots

    // Game Rules
    TICK_RATE: 180, // Server physics calculations per second
    MATCH_LENGTH: 1000, // 3 minutes in seconds
    MAX_PLAYERS: 4,

    MAX_HP: 100,
    BULLET_DAMAGE: 34,
};

// Universal export for both Node.js and the Browser
if (typeof module !== "undefined" && module.exports) {
    module.exports = CONSTANTS;
} else {
    window.CONSTANTS = CONSTANTS;
}
