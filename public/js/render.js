const arena = document.getElementById("game-arena");
const timerEl = document.getElementById("timer");
const scoreboardEl = document.getElementById("scoreboard");

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

    for (const id in STATE.serverState.players) {
        const p = STATE.serverState.players[id];

        if (previousScores[id] !== undefined && p.score > previousScores[id]) {
            AUDIO.play("score");
        }

        if (previousStunState[id] === false && p.isStunned === true) {
            AUDIO.play("stun");
        }

        previousScores[id] = p.score;
        previousStunState[id] = p.isStunned;

        if (!STATE.playerElements[id]) {
            const el = document.createElement("div");
            el.classList.add("entity", "player");
            el.style.width = `${CONSTANTS.PLAYER_SIZE}px`;
            el.style.height = `${CONSTANTS.PLAYER_SIZE}px`;
            el.style.backgroundColor = p.color;

            if (typeof socket !== "undefined" && id === socket.id) {
                el.style.border = "3px solid white";
                el.style.boxSizing = "border-box";
                el.style.zIndex = 10;
            }

            arena.appendChild(el);
            STATE.playerElements[id] = el;
        }

        STATE.playerElements[id].style.transform =
            `translate3d(${p.x}px, ${p.y}px, 0)`;
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

    requestAnimationFrame(renderLoop);
}
