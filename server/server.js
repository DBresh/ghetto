const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const CONSTANTS = require("../shared/constants");
const Game = require("./game"); // Import our new engine

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "../public")));
app.use("/shared", express.static(path.join(__dirname, "../shared")));

// Instantiate the game universe
const game = new Game();

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Add player to the physics engine
    game.addPlayer(socket.id);

    // Listen for keystrokes from this specific client
    socket.on("player_input", (inputs) => {
        game.handleInput(socket.id, inputs);
    });

    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        game.removePlayer(socket.id);
    });
});

// THE MASTER TICK LOOP
// This runs constantly, calculates math, and shouts the result to everyone
setInterval(() => {
    const worldState = game.update();
    io.emit("state_update", worldState);
}, 1000 / CONSTANTS.TICK_RATE); // 1000ms / 60 = ~16.6ms per tick

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Game Server running on http://localhost:${PORT}`);
    console.log(`Tick Rate set to: ${CONSTANTS.TICK_RATE}Hz`);
});
