const socket = io();
const arena = document.getElementById("game-arena");
const timerEl = document.getElementById("timer");
const scoreboardEl = document.getElementById("scoreboard");
const menuOverlay = document.getElementById("menu-overlay");
const eventLog = document.getElementById("event-log");

const relicWrapper = document.createElement("div");
relicWrapper.classList.add("entity");
relicWrapper.style.width = "30px";
relicWrapper.style.height = "30px";

const relicVisual = document.createElement("div");
relicVisual.classList.add("relic");
relicVisual.style.width = "100%";
relicVisual.style.height = "100%";

relicWrapper.appendChild(relicVisual);
arena.appendChild(relicWrapper);

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

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
});

// Clean up DOM elements if someone quits
socket.on("player_left", (id) => {
    if (playerElements[id]) {
        playerElements[id].remove();
        delete playerElements[id];
    }
});

window.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
        if (isMenuOpen) {
            socket.emit("action_resume");
        } else {
            socket.emit("action_pause");
        }
    }
});

document.getElementById("btn-resume").addEventListener("click", () => {
    socket.emit("action_resume");
});

document.getElementById("btn-quit").addEventListener("click", () => {
    socket.emit("action_quit");
    document.body.innerHTML =
        "<h1 style='text-align:center; margin-top:20vh;'>You left the game.</h1>";
});

let isMenuOpen = false;
socket.on("pause_state_changed", (isPaused) => {
    isMenuOpen = isPaused;
    if (isPaused) {
        menuOverlay.style.display = "flex";
    } else {
        menuOverlay.style.display = "none";
    }
});

let logTimeout;
socket.on("server_message", (msg) => {
    eventLog.innerText = msg;
    clearTimeout(logTimeout);
    // Hide the message after 4 seconds
    logTimeout = setTimeout(() => {
        eventLog.innerText = "";
    }, 4000);
});

function resizeArena() {
    // Find how much we need to shrink/grow to fit the width and height
    const scaleX = window.innerWidth / CONSTANTS.WORLD_WIDTH;
    const scaleY = window.innerHeight / CONSTANTS.WORLD_HEIGHT;
    // Pick the smaller scale to ensure the whole box fits on screen without stretching
    const scale = Math.min(scaleX, scaleY) * 0.95; // 0.95 adds a tiny 5% margin

    arena.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", resizeArena);
resizeArena(); // Run it once immediately on load

// Send our input state to the server (independent of rendering)
setInterval(() => {
    socket.emit("player_input", keys);
}, 1000 / CONSTANTS.TICK_RATE);

// Render Loop (Tied to the monitor's refresh rate)
function render() {
    if (serverState.relic) {
        relicWrapper.style.transform = `translate3d(${serverState.relic.x}px, ${serverState.relic.y}px, 0)`;
    }

    // --- NEW UI RENDER (Timer & Scoreboard) ---
    if (serverState.timeLeft !== undefined) {
        timerEl.innerText = serverState.isGameOver
            ? "GAME OVER"
            : formatTime(serverState.timeLeft);
    }

    // Build the scoreboard dynamically
    let scoreHTML = "<strong>Scores:</strong><br>";
    // Sort players by score (highest first)
    const sortedPlayers = Object.values(serverState.players || {}).sort(
        (a, b) => b.score - a.score,
    );

    sortedPlayers.forEach((p, index) => {
        // Highlight the current player's name
        const isMe = p.id === socket.id ? " (You)" : "";
        scoreHTML += `<span style="color: ${p.color}">Player ${index + 1}${isMe}: ${p.score}</span><br>`;
    });
    scoreboardEl.innerHTML = scoreHTML;

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
