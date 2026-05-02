class UIManager {
    constructor() {
        this.menuOverlay = document.getElementById("menu-overlay");
        this.eventLog = document.getElementById("event-log");
        this.logTimeout = null;

        this.initMenuListeners();
    }

    initMenuListeners() {
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

    showAnnouncement(msg) {
        this.eventLog.innerText = msg;
        clearTimeout(this.logTimeout);
        this.logTimeout = setTimeout(() => {
            this.eventLog.innerText = "";
        }, 4000);
    }
}

const UI = new UIManager();
