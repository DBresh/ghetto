const TILE_SIZE = 100;
const CLASSIC_MAP = [
    "....................",
    "..BB..BB....BB..BB..",
    "..BB..BB....BB..BB..",
    "..BB..BB....BB..BB..",
    "..BB..BB.SS.BB..BB..",
    "..BB..BB....BB..BB..",
    "........BBBB........",
    "..BB..B......B..BB..",
    "..BB..B..BB..B..BB..",
    ".........BB.........",
];

const CONSTANTS = {
    WORLD_WIDTH: CLASSIC_MAP[0].length * TILE_SIZE,
    WORLD_HEIGHT: CLASSIC_MAP.length * TILE_SIZE,

    PLAYER_WIDTH: 66,
    PLAYER_HEIGHT: 40,
    PLAYER_SPEED: 300,
    TANK_ROTATION_SPEED: 3.5, // Radians per second

    BULLET_SIZE: 10,
    BULLET_SPEED: 800, // units per second
    FIRE_COOLDOWN: 1000, // ms between shots

    TICK_RATE: 180, // fps
    MATCH_LENGTH: 1000, // secs
    MAX_PLAYERS: 4,

    MAX_HP: 100,
    BULLET_DAMAGE: 34,

    POWERUP_SIZE: 30,
    POWERUP_TYPES: ["RELIC", "SPEED", "DOUBLE_BARREL", "SHIELD"],
    BUFF_DURATION: 6000, // ms
    HEAL_AMOUNT: 25,
    SPEED_MULTIPLIER: 2.5,
    SHIELD_CHARGES: 2,
    MAX_POWERUPS: 5,

    TILE_SIZE: TILE_SIZE,
    CLASSIC_MAP: CLASSIC_MAP,
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = CONSTANTS;
} else {
    window.CONSTANTS = CONSTANTS;
}
