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
    const rect = arenaElement.getBoundingClientRect();
    const xRelativeToArena = e.clientX - rect.left;
    const yRelativeToArena = e.clientY - rect.top;
    keys.mouseX = xRelativeToArena * (CONSTANTS.WORLD_WIDTH / rect.width);
    keys.mouseY = yRelativeToArena * (CONSTANTS.WORLD_HEIGHT / rect.height);
});

window.addEventListener("mousedown", () => {
    keys.shooting = true;
    AUDIO.play("shoot");
});

window.addEventListener("mouseup", () => (keys.shooting = false));
