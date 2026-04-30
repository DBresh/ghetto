const socket = io();
const arena = document.getElementById("game-arena");
const timerEl = document.getElementById("timer");
const scoreboardEl = document.getElementById("scoreboard");

const relicElement = document.createElement("div");
relicElement.classList.add("entity", "relic");
arena.appendChild(relicElement);

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

// 2. Send our input state to the server (independent of rendering)
setInterval(() => {
    socket.emit("player_input", keys);
}, 1000 / CONSTANTS.TICK_RATE);

// 3. The Render Loop (Tied to the monitor's refresh rate)
function render() {
    if (serverState.relic) {
        // Because of the CSS animation we added, it will pulse automatically!
        relicElement.style.transform = `translate3d(${serverState.relic.x}px, ${serverState.relic.y}px, 0)`;
        console.log(serverState.relic.x, serverState.relic.y);
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
