const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    shooting: false,
    mouseX: 0,
    mouseY: 0,
};

const arenaElement = document.getElementById("game-arena");

let rawMouseX = window.innerWidth / 2;
let rawMouseY = window.innerHeight / 2;

// Keyboard tracking
window.addEventListener("keydown", (e) => {
    if (e.code === "KeyW" || e.code === "ArrowUp") keys.up = true;
    if (e.code === "KeyS" || e.code === "ArrowDown") keys.down = true;
    if (e.code === "KeyA" || e.code === "ArrowLeft") keys.left = true;
    if (e.code === "KeyD" || e.code === "ArrowRight") keys.right = true;
});

window.addEventListener("keyup", (e) => {
    if (e.code === "KeyW" || e.code === "ArrowUp") keys.up = false;
    if (e.code === "KeyS" || e.code === "ArrowDown") keys.down = false;
    if (e.code === "KeyA" || e.code === "ArrowLeft") keys.left = false;
    if (e.code === "KeyD" || e.code === "ArrowRight") keys.right = false;
});

// Mouse tracking
window.addEventListener("mousemove", (e) => {
    rawMouseX = e.clientX;
    rawMouseY = e.clientY;
});

window.addEventListener("mousedown", () => {
    // 1. Get our specific tank to make sure we aren't stunned
    const myTank =
        typeof socket !== "undefined"
            ? STATE.serverState.players[socket.id]
            : null;
    if (myTank && myTank.isStunned) return;

    // 2. Check the cooldown locally!
    const now = Date.now();
    if (now - STATE.lastShotTime >= CONSTANTS.FIRE_COOLDOWN) {
        keys.shooting = true;
        STATE.lastShotTime = now; // Start the UI cooldown timer
        if (typeof AUDIO !== "undefined") AUDIO.play("shoot");
    }
});

window.addEventListener("mouseup", () => {
    keys.shooting = false;
});

function updateAimCoordinates() {
    const arenaElement = document.getElementById("game-arena");
    if (!arenaElement) return;

    const rect = arenaElement.getBoundingClientRect();

    // Find mouse's distance from the top-left of the currently shifted arena
    const xRelativeToArena = rawMouseX - rect.left;
    const yRelativeToArena = rawMouseY - rect.top;

    keys.mouseX = xRelativeToArena * (CONSTANTS.WORLD_WIDTH / rect.width);
    keys.mouseY = yRelativeToArena * (CONSTANTS.WORLD_HEIGHT / rect.height);
}
