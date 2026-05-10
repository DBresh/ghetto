const STATE = {
    serverState: { players: {}, bullets: [] },
    playerElements: {},
    bulletPool: [],
    MAX_BULLETS: 50,
    isMenuOpen: false,
    lastShotTime: 0,
    knownBullets: new Set(),
};
