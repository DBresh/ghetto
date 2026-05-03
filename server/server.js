const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const CONSTANTS = require("../shared/constants");
const Game = require("./game");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "../public")));
app.use("/shared", express.static(path.join(__dirname, "../shared")));

const activeGames = {};

function broadcastLobbyList() {
    const lobbies = Object.keys(activeGames).map((roomId) => ({
        id: roomId,
        players: Object.keys(activeGames[roomId].players).length,
    }));
    io.emit("lobby_list_update", lobbies);
}

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    broadcastLobbyList();

    socket.on("create_lobby", (data) => {
        const roomId =
            "ROOM_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        activeGames[roomId] = new Game();
        joinRoom(socket, roomId, data.name);
        broadcastLobbyList();
    });

    socket.on("join_lobby", (data) => {
        if (activeGames[data.roomId]) {
            joinRoom(socket, data.roomId, data.name);
            broadcastLobbyList();
        }
    });

    function joinRoom(socket, roomId, playerName) {
        socket.roomId = roomId;
        socket.join(roomId);

        const game = activeGames[roomId];
        game.addPlayer(socket.id, playerName);

        socket.emit("joined_lobby", roomId);
        socket.emit("map_data", {
            width: CONSTANTS.WORLD_WIDTH,
            height: CONSTANTS.WORLD_HEIGHT,
            obstacles: game.obstacles,
        });

        console.log(`${playerName} (${socket.id}) joined ${roomId}`);
    }

    socket.on("player_input", (inputs) => {
        if (socket.roomId && activeGames[socket.roomId]) {
            activeGames[socket.roomId].handleInput(socket.id, inputs);
        }
    });

    socket.on("chat_message", (msg) => {
        if (socket.roomId && activeGames[socket.roomId]) {
            const game = activeGames[socket.roomId];
            const cleanMsg = String(msg).trim().substring(0, 100);
            if (cleanMsg && game.players[socket.id]) {
                io.to(socket.roomId).emit("chat_message", {
                    color: game.players[socket.id].color,
                    text: cleanMsg,
                });
            }
        }
    });

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
        if (socket.roomId && activeGames[socket.roomId]) {
            const game = activeGames[socket.roomId];
            game.removePlayer(socket.id);

            if (Object.keys(game.players).length === 0) {
                delete activeGames[socket.roomId];
                console.log(`Room ${socket.roomId} destroyed.`);
            }
            broadcastLobbyList();
        }
    });

    socket.on("action_pause", () => {
        if (socket.roomId && activeGames[socket.roomId]) {
            // Only pause if this player actually exists in the game
            if (activeGames[socket.roomId].players[socket.id]) {
                activeGames[socket.roomId].isPaused = true;
                // Broadcast to the whole room that the game is paused
                io.to(socket.roomId).emit("pause_state_changed", true);
            }
        }
    });

    socket.on("action_resume", () => {
        if (socket.roomId && activeGames[socket.roomId]) {
            activeGames[socket.roomId].isPaused = false;
            io.to(socket.roomId).emit("pause_state_changed", false);
        }
    });

    socket.on("action_quit", () => {
        if (socket.roomId && activeGames[socket.roomId]) {
            activeGames[socket.roomId].removePlayer(socket.id);
            socket.leave(socket.roomId);
            socket.roomId = null;
        }
    });
});

setInterval(() => {
    for (const roomId in activeGames) {
        const game = activeGames[roomId];
        const state = game.update();

        if (game.events.length > 0) {
            game.events.forEach((ev) => io.to(roomId).emit("kill_event", ev));
            game.events = [];
        }

        io.to(roomId).emit("state_update", state);
    }
}, 1000 / CONSTANTS.TICK_RATE);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
