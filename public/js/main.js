const socket = io();

// 1. START THE GRAPHICS ENGINE
initRenderer();

// 2. FORCE ARENA SIZING
const arenaEl = document.getElementById("game-arena");
arenaEl.style.width = `${CONSTANTS.WORLD_WIDTH}px`;
arenaEl.style.height = `${CONSTANTS.WORLD_HEIGHT}px`;

// 3. NETWORK INBOUND (Server -> Client)
socket.on("state_update", (state) => {
    STATE.serverState = state;
});

socket.on("pause_state_changed", (isPaused) => {
    UI.setPauseState(isPaused);
});

socket.on("server_message", (msg) => {
    UI.showAnnouncement(msg);
});

socket.on("map_data", (data) => {
    if (typeof buildObstacles === "function") {
        buildObstacles(data.obstacles);
    }
});

socket.on("chat_message", (data) => {
    UI.addChatMessage(data.color, data.text);
});

socket.on("kill_event", (data) => {
    UI.addKillFeedItem(data.killerColor, data.victimColor);
});

// 4. NETWORK OUTBOUND (Client -> Server)
setInterval(() => {
    // Grab the freshly calculated math from our Input class and send it
    const latestInputs = INPUT.getProcessedInputs();
    socket.emit("player_input", latestInputs);
}, 1000 / CONSTANTS.TICK_RATE);
