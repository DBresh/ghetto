// shared/constants.js
const CONSTANTS = {
    // Virtual World Dimensions
    WORLD_WIDTH: 2000,
    WORLD_HEIGHT: 1000,

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

    POWERUP_SIZE: 30,
    POWERUP_TYPES: ["RELIC", "SPEED", "DOUBLE_BARREL", "SHIELD"],
    BUFF_DURATION: 6000, // 6 seconds for temporary buffs
    HEAL_AMOUNT: 25,
    SPEED_MULTIPLIER: 2,
    SHIELD_CHARGES: 2,
    MAX_POWERUPS: 8,
};

// Universal export for both Node.js and the Browser
if (typeof module !== "undefined" && module.exports) {
    module.exports = CONSTANTS;
} else {
    window.CONSTANTS = CONSTANTS;
}
