const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    shooting: false,
    mouseX: 0,
    mouseY: 0,
};

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
    keys.mouseX = e.clientX;
    keys.mouseY = e.clientY;
});

window.addEventListener("mousedown", () => (keys.shooting = true));
window.addEventListener("mouseup", () => (keys.shooting = false));
