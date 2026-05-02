class UIManager {
    constructor() {
        this.menuOverlay = document.getElementById("menu-overlay");
        this.chatInput = document.getElementById("chat-input");
        this.chatMessages = document.getElementById("chat-messages");
        this.killFeed = document.getElementById("kill-feed");
        this.logTimeout = null;

        this.initMenuListeners();
    }

    initMenuListeners() {
        window.addEventListener("keydown", (e) => {
            // --- NEW: Chat Input Handling ---
            if (e.code === "Enter") {
                if (document.activeElement === this.chatInput) {
                    // We are done typing, send it!
                    const msg = this.chatInput.value.trim();
                    if (msg) socket.emit("chat_message", msg);
                    this.chatInput.value = "";
                    this.chatInput.blur(); // Unfocus the input
                } else {
                    // We weren't typing, so open the chat and halt the tank!
                    if (typeof INPUT !== "undefined") INPUT.resetKeys();
                    this.chatInput.focus();
                }
                return; // Prevent Enter from doing anything else
            }

            if (e.code === "Escape") {
                if (document.activeElement === this.chatInput) {
                    this.chatInput.blur(); // Cancel chat on Esc
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

        // Keep only the last 50 messages
        if (this.chatMessages.childElementCount > 50) {
            this.chatMessages.removeChild(this.chatMessages.firstChild);
        }

        // Auto-scroll to the bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    addKillFeedItem(killerColor, victimColor) {
        const el = document.createElement("div");
        el.className = "kill-feed-item";
        // The bullet icon (➤) between the tanks
        el.innerHTML = `<span style="color: ${killerColor}">Tank</span> ➤ <span style="color: ${victimColor}">Tank</span>`;

        this.killFeed.appendChild(el);

        // Clean up the DOM element after the CSS fade animation finishes (5 seconds)
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
