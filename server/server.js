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

    socket.on("action_pause", () => {
        game.isPaused = true;
        io.emit(
            "server_message",
            `Player ${socket.id.substring(0, 4)} paused the game.`,
        );
        io.emit("pause_state_changed", true);
    });

    socket.on("action_resume", () => {
        game.isPaused = false;
        io.emit(
            "server_message",
            `Player ${socket.id.substring(0, 4)} resumed the game.`,
        );
        io.emit("pause_state_changed", false);
    });

    socket.on("action_quit", () => {
        io.emit(
            "server_message",
            `Player ${socket.id.substring(0, 4)} rage quit!`,
        );
        game.removePlayer(socket.id);
        socket.disconnect();
    });

    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        game.removePlayer(socket.id);
        io.emit("player_left", socket.id);
    });

    socket.emit("map_data", {
        width: CONSTANTS.WORLD_WIDTH,
        height: CONSTANTS.WORLD_HEIGHT,
        obstacles: game.obstacles,
    });

    socket.on("chat_message", (msg) => {
        const cleanMsg = String(msg).trim().substring(0, 100);
        if (cleanMsg && game.players[socket.id]) {
            io.emit("chat_message", {
                color: game.players[socket.id].color,
                text: cleanMsg,
            });
        }
    });
});

// THE MASTER TICK LOOP
// This runs constantly, calculates math, and shouts the result to everyone
setInterval(() => {
    const state = game.update();

    // If anyone died this frame, tell all clients!
    if (game.events.length > 0) {
        game.events.forEach((ev) => io.emit("kill_event", ev));
        game.events = []; // Clear the queue
    }

    io.emit("state_update", state);
}, 1000 / CONSTANTS.TICK_RATE);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Game Server running on http://localhost:${PORT}`);
    console.log(`Tick Rate set to: ${CONSTANTS.TICK_RATE}Hz`);
});
