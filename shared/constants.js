// shared/constants.js
const CONSTANTS = {
    // Virtual World Dimensions
    WORLD_WIDTH: 1000,
    WORLD_HEIGHT: 1000,

    // Player Physics (Virtual Units)
    PLAYER_SIZE: 40,
    PLAYER_SPEED: 400, // units per second

    // Projectile Physics
    BULLET_SIZE: 10,
    BULLET_SPEED: 800, // units per second
    FIRE_COOLDOWN: 250, // ms between shots

    // Game Rules
    TICK_RATE: 60, // Server physics calculations per second
    MATCH_LENGTH: 1000, // 3 minutes in seconds
    MAX_PLAYERS: 4,
};

// Universal export for both Node.js and the Browser
if (typeof module !== "undefined" && module.exports) {
    module.exports = CONSTANTS;
} else {
    window.CONSTANTS = CONSTANTS;
}
