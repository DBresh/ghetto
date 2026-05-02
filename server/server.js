const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const CONSTANTS = require("../shared/constants");
const Game = require("./game");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use("/shared", express.static(path.join(__dirname, "shared")));

// --- NEW: LOBBY MANAGEMENT ---
const activeGames = {}; // Maps roomId -> Game Instance

function broadcastLobbyList() {
    // Create a simplified array of lobbies to send to people on the main menu
    const lobbies = Object.keys(activeGames).map((roomId) => ({
        id: roomId,
        players: Object.keys(activeGames[roomId].players).length,
    }));
    io.emit("lobby_list_update", lobbies); // Send to everyone
}

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // When they connect, immediately send them the current lobbies
    broadcastLobbyList();

    // 1. Create a Lobby
    socket.on("create_lobby", () => {
        const roomId =
            "ROOM_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        activeGames[roomId] = new Game(); // Create a fresh game engine!
        joinRoom(socket, roomId);
        broadcastLobbyList();
    });

    // 2. Join a Lobby
    socket.on("join_lobby", (roomId) => {
        if (activeGames[roomId]) {
            joinRoom(socket, roomId);
            broadcastLobbyList();
        }
    });

    // Helper: Move socket into room and init their tank
    function joinRoom(socket, roomId) {
        socket.roomId = roomId; // Remember which room they are in
        socket.join(roomId);

        const game = activeGames[roomId];
        game.addPlayer(socket.id);

        // Tell their specific client they joined, and send the map data!
        socket.emit("joined_lobby", roomId);
        socket.emit("map_data", {
            width: CONSTANTS.WORLD_WIDTH,
            height: CONSTANTS.WORLD_HEIGHT,
            obstacles: game.obstacles,
        });

        console.log(`${socket.id} joined ${roomId}`);
    }

    // 3. Gameplay Routing (Route inputs only to THEIR game)
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
                // Emit ONLY to their room
                io.to(socket.roomId).emit("chat_message", {
                    color: game.players[socket.id].color,
                    text: cleanMsg,
                });
            }
        }
    });

    // 4. Disconnect Handling
    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
        if (socket.roomId && activeGames[socket.roomId]) {
            const game = activeGames[socket.roomId];
            game.removePlayer(socket.id);

            // Clean up the room if everyone left
            if (Object.keys(game.players).length === 0) {
                delete activeGames[socket.roomId];
                console.log(`Room ${socket.roomId} destroyed.`);
            }
            broadcastLobbyList();
        }
    });
});

// --- NEW: THE MULTI-ROOM TICK LOOP ---
setInterval(() => {
    // Loop through every active room and update its physics separately
    for (const roomId in activeGames) {
        const game = activeGames[roomId];
        const state = game.update();

        // Broadcast kill feed events for this specific room
        if (game.events.length > 0) {
            game.events.forEach((ev) => io.to(roomId).emit("kill_event", ev));
            game.events = [];
        }

        // Broadcast physics state to only the players in this room
        io.to(roomId).emit("state_update", state);
    }
}, 1000 / CONSTANTS.TICK_RATE);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
