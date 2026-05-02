// --- DOM ELEMENTS ---
const arena = document.getElementById("game-arena");
const timerEl = document.getElementById("timer");
const scoreboardEl = document.getElementById("scoreboard");
const reloadBar = document.getElementById("reload-bar");
const hpBar = document.getElementById("hp-bar");

let previousScores = {};

// --- INIT SETUP ---
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

    renderRelic();
    renderUI();
    renderPlayers();
    cleanupDisconnectedPlayers();
    renderBullets();
    updateCamera();

    requestAnimationFrame(renderLoop);
}

// --- RENDER HELPERS ---

function renderRelic() {
    if (STATE.serverState.relic) {
        relicWrapper.style.transform = `translate3d(${STATE.serverState.relic.x}px, ${STATE.serverState.relic.y}px, 0)`;
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
