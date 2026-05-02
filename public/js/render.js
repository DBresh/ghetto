const arena = document.getElementById("game-arena");
const timerEl = document.getElementById("timer");
const scoreboardEl = document.getElementById("scoreboard");
const reloadBar = document.getElementById("reload-bar");
const hpBar = document.getElementById("hp-bar");

let previousScores = {};
let previousStunState = {};

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

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function renderLoop() {
    if (STATE.serverState.relic) {
        relicWrapper.style.transform = `translate3d(${STATE.serverState.relic.x}px, ${STATE.serverState.relic.y}px, 0)`;
    }

    if (STATE.serverState.timeLeft !== undefined) {
        timerEl.innerText = STATE.serverState.isGameOver
            ? "GAME OVER"
            : formatTime(STATE.serverState.timeLeft);
    }

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

    if (typeof socket !== "undefined" && STATE.serverState.players[socket.id]) {
        const myTank = STATE.serverState.players[socket.id];

        // 1. Update HP Bar
        const hpPercent = Math.max(0, myTank.hp / CONSTANTS.MAX_HP);
        hpBar.style.transform = `scaleX(${hpPercent})`;

        // 2. Update Reload Bar
        const timeSinceShot = Date.now() - STATE.lastShotTime;
        let reloadPercent = timeSinceShot / CONSTANTS.FIRE_COOLDOWN;
        if (reloadPercent > 1) reloadPercent = 1;

        reloadBar.style.transform = `scaleX(${reloadPercent})`;
    }

    for (const id in STATE.serverState.players) {
        const p = STATE.serverState.players[id];

        // Did they score/stun? (Keep your audio logic here)[cite: 4]
        if (previousScores[id] !== undefined && p.score > previousScores[id])
            AUDIO.play("score");
        if (previousStunState[id] === false && p.isStunned === true)
            AUDIO.play("stun");
        previousScores[id] = p.score;
        previousStunState[id] = p.isStunned;

        // If the tank doesn't exist yet, build its DOM hierarchy
        if (!STATE.playerElements[id]) {
            // Root Wrapper (Handles X/Y Translation)
            const el = document.createElement("div");
            el.classList.add("entity", "player-wrapper");
            el.style.width = `${CONSTANTS.PLAYER_SIZE}px`;
            el.style.height = `${CONSTANTS.PLAYER_SIZE}px`;

            // Tank Base (Handles Chassis Rotation)
            const base = document.createElement("div");
            base.classList.add("tank-base");
            base.style.backgroundColor = p.color;

            // Tank Turret (Handles Mouse Aim Rotation)
            const turret = document.createElement("div");
            turret.classList.add("tank-turret");

            const barrel = document.createElement("div");
            barrel.classList.add("tank-barrel");
            turret.appendChild(barrel);

            if (typeof socket !== "undefined" && id === socket.id) {
                el.style.filter = "drop-shadow(0 0 5px white)";
                el.style.zIndex = 10;
            }

            // Assemble the tank
            el.appendChild(base);
            el.appendChild(turret);
            arena.appendChild(el);

            // Store references to all moving parts so we can rotate them later
            STATE.playerElements[id] = { root: el, base: base, turret: turret };
        }

        // Apply hardware-accelerated transforms to the specific layers
        const domObj = STATE.playerElements[id];

        // 1. Move the whole tank
        domObj.root.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;

        // 2. Rotate the chassis (A/D keys)
        domObj.base.style.transform = `rotate(${p.baseAngle}rad)`;

        // 3. Rotate the turret (Mouse)
        domObj.turret.style.transform = `rotate(${p.turretAngle}rad)`;
    }

    for (const domId in STATE.playerElements) {
        if (!STATE.serverState.players[domId]) {
            STATE.playerElements[domId].remove();
            delete STATE.playerElements[domId];
        }
    }

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

    if (typeof socket !== "undefined" && STATE.serverState.players[socket.id]) {
        const myTank = STATE.serverState.players[socket.id];

        // Find the center of the browser window
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;

        // Calculate the offset required to put our tank exactly in the center
        // We subtract half the player size so it tracks the center of the tank, not the top-left corner
        const cameraX = screenCenterX - myTank.x - CONSTANTS.PLAYER_SIZE / 2;
        const cameraY = screenCenterY - myTank.y - CONSTANTS.PLAYER_SIZE / 2;

        // Move the entire arena!
        arena.style.transform = `translate3d(${cameraX}px, ${cameraY}px, 0)`;
    }

    requestAnimationFrame(renderLoop);
}
