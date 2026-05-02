const socket = io();

const arenaEl = document.getElementById("game-arena");
arenaEl.style.width = `${CONSTANTS.WORLD_WIDTH}px`;
arenaEl.style.height = `${CONSTANTS.WORLD_HEIGHT}px`;

socket.on("lobby_list_update", (lobbies) => {
    UI.renderLobbyList(lobbies);
});

socket.on("joined_lobby", (roomId) => {
    console.log(`Joined Room: ${roomId}`);
    UI.enterGame();
});

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
    RENDERER.buildObstacles(data.obstacles);
    RENDERER.start();
});

socket.on("chat_message", (data) => {
    UI.addChatMessage(data.color, data.text);
});

socket.on("kill_event", (data) => {
    UI.addKillFeedItem(data.killerColor, data.victimColor);
});

setInterval(() => {
    const latestInputs = INPUT.getProcessedInputs();
    socket.emit("player_input", latestInputs);
}, 1000 / CONSTANTS.TICK_RATE);
