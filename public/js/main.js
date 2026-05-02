const socket = io();
const menuOverlay = document.getElementById("menu-overlay");
const eventLog = document.getElementById("event-log");
const arenaEl = document.getElementById("game-arena");
arenaEl.style.width = `${CONSTANTS.WORLD_WIDTH}px`;
arenaEl.style.height = `${CONSTANTS.WORLD_HEIGHT}px`;

initRenderer();

socket.on("state_update", (state) => {
    STATE.serverState = state;
});

setInterval(() => {
    if (typeof updateAimCoordinates === "function") {
        updateAimCoordinates();
    }

    socket.emit("player_input", keys);
}, 1000 / CONSTANTS.TICK_RATE);

let logTimeout;
socket.on("server_message", (msg) => {
    eventLog.innerText = msg;
    clearTimeout(logTimeout);
    logTimeout = setTimeout(() => {
        eventLog.innerText = "";
    }, 4000);
});

socket.on("pause_state_changed", (isPaused) => {
    STATE.isMenuOpen = isPaused;
    menuOverlay.style.display = isPaused ? "flex" : "none";
});

window.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
        if (STATE.isMenuOpen) {
            socket.emit("action_resume");
        } else {
            socket.emit("action_pause");
        }
    }
});

document
    .getElementById("btn-resume")
    .addEventListener("click", () => socket.emit("action_resume"));
document.getElementById("btn-quit").addEventListener("click", () => {
    socket.emit("action_quit");
    document.body.innerHTML =
        "<h1 style='text-align:center; margin-top:20vh;'>You left the game.</h1>";
});

function resizeArena() {
    arenaEl = document.getElementById("game-arena");
    const scaleX = window.innerWidth / CONSTANTS.WORLD_WIDTH;
    const scaleY = window.innerHeight / CONSTANTS.WORLD_HEIGHT;
    const scale = Math.min(scaleX, scaleY) * 0.95;
    arenaEl.style.transform = `scale(${scale})`;
}
window.addEventListener("resize", resizeArena);
resizeArena();
