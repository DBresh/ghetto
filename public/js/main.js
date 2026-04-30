const socket = io();
const arena = document.getElementById("game-arena");

let serverState = { players: {} };
const playerElements = {}; // This stores our actual DOM elements
const MAX_BULLETS = 50;
const bulletPool = [];

for (let i = 0; i < MAX_BULLETS; i++) {
    const el = document.createElement("div");
    el.classList.add("entity", "bullet");
    el.style.display = "none"; // Hidden by default
    arena.appendChild(el);
    bulletPool.push(el);
}

// 1. Listen for the absolute truth from the server
socket.on("state_update", (state) => {
    serverState = state;

    // Add this debug block:
    if (state.bullets && state.bullets.length > 0) {
        // We only log if a global flag isn't set, to prevent flooding the console
        if (!window.hasLoggedBullet) {
            console.log(
                `[CLIENT RENDER] Received bullets from server! First bullet at X: ${state.bullets[0].x}`,
            );
            window.hasLoggedBullet = true;
            setTimeout(() => (window.hasLoggedBullet = false), 1000); // Allow one log per second
        }
    }
});

// Clean up DOM elements if someone quits
socket.on("player_left", (id) => {
    if (playerElements[id]) {
        playerElements[id].remove();
        delete playerElements[id];
    }
});

// 2. Send our input state to the server (independent of rendering)
setInterval(() => {
    socket.emit("player_input", keys);
}, 1000 / CONSTANTS.TICK_RATE);

// 3. The Render Loop (Tied to the monitor's refresh rate)
function render() {
    for (const id in serverState.players) {
        const p = serverState.players[id];

        // If a player joined but doesn't have a DOM element yet, create one
        if (!playerElements[id]) {
            const el = document.createElement("div");
            el.classList.add("entity", "player");
            el.style.width = `${CONSTANTS.PLAYER_SIZE}px`;
            el.style.height = `${CONSTANTS.PLAYER_SIZE}px`;
            el.style.backgroundColor = p.color;

            // Draw a white border around our own player to easily identify it
            if (id === socket.id) {
                el.style.border = "3px solid white";
                el.style.boxSizing = "border-box";
                el.style.zIndex = 10;
            }

            arena.appendChild(el);
            playerElements[id] = el;
        }

        // The GPU-Accelerated move command
        playerElements[id].style.transform =
            `translate3d(${p.x}px, ${p.y}px, 0)`;
    }

    // Bullet Rendering (Object Pooling)
    const activeBullets = serverState.bullets || [];

    // 1. Loop through all pool elements
    for (let i = 0; i < MAX_BULLETS; i++) {
        const domBullet = bulletPool[i];
        const serverBullet = activeBullets[i];

        if (serverBullet) {
            // If the server says a bullet exists here, wake up a DOM element
            domBullet.style.display = "block";
            domBullet.style.transform = `translate3d(${serverBullet.x}px, ${serverBullet.y}px, 0)`;
        } else {
            // If there are no more active server bullets, hide the remaining pool elements
            if (domBullet.style.display !== "none") {
                domBullet.style.display = "none";
            }
        }
    }

    // Ask the browser to call render() again before the next screen repaint
    requestAnimationFrame(render);
}

// Start the loop!
requestAnimationFrame(render);
