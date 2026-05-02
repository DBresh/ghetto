// --- DOM ELEMENTS ---
const arena = document.getElementById("game-arena");
const timerEl = document.getElementById("timer");
const scoreboardEl = document.getElementById("scoreboard");
const reloadBar = document.getElementById("reload-bar");
const hpBar = document.getElementById("hp-bar");
let domRelics = {};

let previousScores = {};

// --- INIT SETUP ---

function initRenderer() {
    for (let i = 0; i < STATE.MAX_BULLETS; i++) {
        const el = document.createElement("div");
        el.classList.add("entity", "bullet");
        el.style.display = "none";
        arena.appendChild(el);
        STATE.bulletPool.push(el);
    }
    requestAnimationFrame(renderLoop);
}

// --- MAIN RENDER PIPELINE ---
function renderLoop() {
    if (!STATE.serverState) return requestAnimationFrame(renderLoop);

    renderRelics();
    renderUI();
    renderPlayers();
    cleanupDisconnectedPlayers();
    renderBullets();
    updateCamera();

    requestAnimationFrame(renderLoop);
}

// --- RENDER HELPERS ---

function renderRelics() {
    const activeRelics = STATE.serverState.relics || [];
    const activeIds = new Set();

    // 1. Create and position active relics
    activeRelics.forEach((r) => {
        activeIds.add(r.id);

        // If it doesn't exist on screen yet, build it
        if (!domRelics[r.id]) {
            const el = document.createElement("div");
            el.classList.add("entity");
            el.style.width = "30px";
            el.style.height = "30px";

            const visual = document.createElement("div");
            visual.classList.add("relic");
            visual.style.width = "100%";
            visual.style.height = "100%";

            el.appendChild(visual);
            arena.appendChild(el);
            domRelics[r.id] = el; // Save reference
        }

        // Move it
        domRelics[r.id].style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
    });

    // 2. Ghost Buster for Relics (Destroy picked-up relics)
    for (const domId in domRelics) {
        if (!activeIds.has(domId)) {
            domRelics[domId].remove();
            delete domRelics[domId];
        }
    }
}

function renderUI() {
    // 1. Match Timer
    if (STATE.serverState.timeLeft !== undefined) {
        const m = Math.floor(STATE.serverState.timeLeft / 60);
        const s = STATE.serverState.timeLeft % 60;
        timerEl.innerText = STATE.serverState.isGameOver
            ? "GAME OVER"
            : `${m}:${s < 10 ? "0" : ""}${s}`;
    }

    // 2. Scoreboard
    let scoreHTML = "<strong>Scores:</strong><br>";
    const sortedPlayers = Object.values(STATE.serverState.players || {}).sort(
        (a, b) => b.score - a.score,
    );
    sortedPlayers.forEach((p, index) => {
        const isMe =
            typeof socket !== "undefined" && p.id === socket.id ? " (You)" : "";
        scoreHTML += `<span style="color: ${p.color}">Player ${index + 1}${isMe}: ${p.score}</span><br>`;
    });
    scoreboardEl.innerHTML = scoreHTML;

    // 3. Player HUD (Health & Reload)
    if (typeof socket !== "undefined" && STATE.serverState.players[socket.id]) {
        const myTank = STATE.serverState.players[socket.id];

        const hpPercent = Math.max(0, myTank.hp / CONSTANTS.MAX_HP);
        hpBar.style.transform = `scaleX(${hpPercent})`;

        const timeSinceShot = Date.now() - STATE.lastShotTime;
        let reloadPercent = Math.min(
            1,
            timeSinceShot / CONSTANTS.FIRE_COOLDOWN,
        );
        reloadBar.style.transform = `scaleX(${reloadPercent})`;
    }
}

function renderPlayers() {
    for (const id in STATE.serverState.players) {
        const p = STATE.serverState.players[id];

        // Audio Triggers
        if (previousScores[id] !== undefined && p.score > previousScores[id]) {
            if (typeof AUDIO !== "undefined") AUDIO.play("score");
        }
        previousScores[id] = p.score;

        // DOM Assembly
        if (!STATE.playerElements[id]) {
            const el = document.createElement("div");
            el.classList.add("entity", "player-wrapper");
            el.style.width = `${CONSTANTS.PLAYER_SIZE}px`;
            el.style.height = `${CONSTANTS.PLAYER_SIZE}px`;

            const base = document.createElement("div");
            base.classList.add("tank-base");
            base.style.backgroundColor = p.color;

            const turret = document.createElement("div");
            turret.classList.add("tank-turret");

            const barrel = document.createElement("div");
            barrel.classList.add("tank-barrel");

            turret.appendChild(barrel);
            el.appendChild(base);
            el.appendChild(turret);

            if (typeof socket !== "undefined" && id === socket.id) {
                el.style.filter = "drop-shadow(0 0 5px white)";
                el.style.zIndex = 10;
            }

            arena.appendChild(el);
            STATE.playerElements[id] = { root: el, base: base, turret: turret };
        }

        // Transforms
        const domObj = STATE.playerElements[id];
        domObj.root.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        domObj.base.style.transform = `rotate(${p.baseAngle}rad)`;
        domObj.turret.style.transform = `rotate(${p.turretAngle}rad)`;
    }
}

function cleanupDisconnectedPlayers() {
    for (const domId in STATE.playerElements) {
        if (!STATE.serverState.players[domId]) {
            STATE.playerElements[domId].root.remove();
            delete STATE.playerElements[domId];
        }
    }
}

function buildObstacles(obstaclesData) {
    const arenaEl = document.getElementById("game-arena");

    obstaclesData.forEach((obs) => {
        const el = document.createElement("div");
        el.style.position = "absolute";
        el.style.left = `${obs.x}px`;
        el.style.top = `${obs.y}px`;
        el.style.width = `${obs.w}px`;
        el.style.height = `${obs.h}px`;
        el.style.backgroundColor = obs.color;

        // Add a subtle border or shadow to make them look like solid walls
        el.style.border = "2px solid #222";
        el.style.boxShadow = "inset 0 0 20px rgba(0,0,0,0.8)";
        el.style.zIndex = 5; // Put them above the floor, but below UI

        arenaEl.appendChild(el);
    });
}

function renderBullets() {
    const activeBullets = STATE.serverState.bullets || [];
    for (let i = 0; i < STATE.MAX_BULLETS; i++) {
        const domBullet = STATE.bulletPool[i];
        const serverBullet = activeBullets[i];

        if (serverBullet) {
            domBullet.style.display = "block";
            domBullet.style.transform = `translate3d(${serverBullet.x}px, ${serverBullet.y}px, 0)`;
        } else {
            if (domBullet.style.display !== "none")
                domBullet.style.display = "none";
        }
    }
}

function updateCamera() {
    if (typeof socket !== "undefined" && STATE.serverState.players[socket.id]) {
        const myTank = STATE.serverState.players[socket.id];
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const cameraX = screenCenterX - myTank.x - CONSTANTS.PLAYER_SIZE / 2;
        const cameraY = screenCenterY - myTank.y - CONSTANTS.PLAYER_SIZE / 2;

        arena.style.transform = `translate3d(${cameraX}px, ${cameraY}px, 0)`;
    }
}
