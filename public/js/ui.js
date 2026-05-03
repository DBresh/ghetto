class UIManager {
    constructor() {
        this.menuOverlay = document.getElementById("menu-overlay");
        this.chatInput = document.getElementById("chat-input");
        this.chatMessages = document.getElementById("chat-messages");
        this.killFeed = document.getElementById("kill-feed");
        this.lobbyScreen = document.getElementById("lobby-screen");
        this.lobbyList = document.getElementById("lobby-list");
        this.btnCreate = document.getElementById("btn-create-lobby");
        this.logTimeout = null;
        this.nameInput = document.getElementById("player-name-input");

        this.initMenuListeners();
        this.initLobbyListeners();
    }

    getPlayerName() {
        let name = this.nameInput.value.trim();
        if (!name) {
            const adjs = [
                "Angry",
                "Sneaky",
                "Derpy",
                "Sweaty",
                "Chonky",
                "Spicy",
                "Ghostly",
                "Tactical",
            ];
            const nouns = [
                "Potato",
                "Goblin",
                "Toaster",
                "Ninja",
                "Pancake",
                "Waffle",
                "Banana",
                "Hamster",
            ];
            name = `${adjs[Math.floor(Math.random() * adjs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
            this.nameInput.value = name;
        }
        return name;
    }

    initLobbyListeners() {
        this.btnCreate.addEventListener("click", () => {
            socket.emit("create_lobby", { name: this.getPlayerName() });
        });
    }

    renderLobbyList(lobbies) {
        this.lobbyList.innerHTML = "";
        if (lobbies.length === 0) {
            this.lobbyList.innerHTML =
                '<div style="text-align:center; color:#777;">No active matches. Create one!</div>';
            return;
        }

        lobbies.forEach((lobby) => {
            const el = document.createElement("div");
            el.className = "lobby-item";
            el.innerHTML = `
                <div>
                    <strong>Match: ${lobby.id}</strong><br>
                    <span style="color:#aaa; font-size: 12px;">Players: ${lobby.players}</span>
                </div>
                <button class="btn-join" onclick="socket.emit('join_lobby', { roomId: '${lobby.id}', name: UI.getPlayerName() })">JOIN</button>
            `;
            this.lobbyList.appendChild(el);
        });
    }

    enterGame() {
        this.lobbyScreen.style.display = "none";
    }

    initMenuListeners() {
        window.addEventListener("keydown", (e) => {
            if (e.code === "Enter") {
                if (document.activeElement === this.chatInput) {
                    const msg = this.chatInput.value.trim();
                    if (msg) socket.emit("chat_message", msg);
                    this.chatInput.value = "";
                    this.chatInput.blur();
                } else {
                    if (typeof INPUT !== "undefined") INPUT.resetKeys();
                    this.chatInput.focus();
                }
                return;
            }

            if (e.code === "Escape") {
                if (document.activeElement === this.chatInput) {
                    this.chatInput.blur();
                } else {
                    if (STATE.isMenuOpen) socket.emit("action_resume");
                    else socket.emit("action_pause");
                }
            }
        });

        window.addEventListener("keydown", (e) => {
            if (e.code === "Escape") {
                if (STATE.isMenuOpen) socket.emit("action_resume");
                else socket.emit("action_pause");
            }
        });

        document.getElementById("btn-resume").addEventListener("click", () => {
            socket.emit("action_resume");
        });

        document.getElementById("btn-quit").addEventListener("click", () => {
            socket.emit("action_quit");
            document.body.innerHTML =
                "<h1 style='text-align:center; margin-top:20vh;'>You left the game.</h1>";
        });
    }

    setPauseState(isPaused) {
        STATE.isMenuOpen = isPaused;
        this.menuOverlay.style.display = isPaused ? "flex" : "none";
    }

    addChatMessage(color, text) {
        const el = document.createElement("div");
        el.innerHTML = `<span style="color: ${color}; font-weight: bold;">Tank:</span> ${text}`;
        this.chatMessages.appendChild(el);

        if (this.chatMessages.childElementCount > 50) {
            this.chatMessages.removeChild(this.chatMessages.firstChild);
        }

        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    addKillFeedItem(ev) {
        const el = document.createElement("div");
        el.className = "kill-feed-item";
        el.innerHTML = `<span style="color: ${ev.killerColor}">${ev.killerName}</span> ➤ <span style="color: ${ev.victimColor}">${ev.victimName}</span>`;
        this.killFeed.appendChild(el);
        setTimeout(() => el.remove(), 5500);
    }

    showAnnouncement(msg) {
        this.eventLog.innerText = msg;
        clearTimeout(this.logTimeout);
        this.logTimeout = setTimeout(() => {
            this.eventLog.innerText = "";
        }, 4000);
    }
}

const UI = new UIManager();
