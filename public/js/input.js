class InputController {
    constructor() {
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            shooting: false,
            mouseX: 0,
            mouseY: 0,
        };
        this.rawMouseX = window.innerWidth / 2;
        this.rawMouseY = window.innerHeight / 2;

        this.initListeners();
    }

    initListeners() {
        window.addEventListener("keydown", (e) => this.setKey(e.code, true));
        window.addEventListener("keyup", (e) => this.setKey(e.code, false));

        window.addEventListener("mousemove", (e) => {
            this.rawMouseX = e.clientX;
            this.rawMouseY = e.clientY;
        });

        window.addEventListener("mousedown", (e) => {
            if (typeof STATE !== "undefined" && STATE.isMenuOpen) return;

            if (
                e.target.closest("#chat-container") ||
                e.target.closest("#lobby-screen")
            )
                return;

            const myTank =
                typeof socket !== "undefined"
                    ? STATE.serverState.players[socket.id]
                    : null;
            if (myTank && myTank.hp <= 0) return;

            const now = Date.now();
            if (now - STATE.lastShotTime >= CONSTANTS.FIRE_COOLDOWN) {
                this.keys.shooting = true;
                STATE.lastShotTime = now;
                if (typeof AUDIO !== "undefined") AUDIO.play("shoot");
            }
        });

        window.addEventListener("mouseup", () => (this.keys.shooting = false));
    }

    setKey(code, isPressed) {
        if (
            document.activeElement &&
            document.activeElement.id === "chat-input" &&
            isPressed
        ) {
            return;
        }

        if (code === "KeyW" || code === "ArrowUp") this.keys.up = isPressed;
        if (code === "KeyS" || code === "ArrowDown") this.keys.down = isPressed;
        if (code === "KeyA" || code === "ArrowLeft") this.keys.left = isPressed;
        if (code === "KeyD" || code === "ArrowRight")
            this.keys.right = isPressed;
    }

    resetKeys() {
        this.keys.up = false;
        this.keys.down = false;
        this.keys.left = false;
        this.keys.right = false;
        this.keys.shooting = false;
    }

    getProcessedInputs() {
        const arenaElement = document.getElementById("game-arena");
        if (arenaElement) {
            const rect = arenaElement.getBoundingClientRect();
            const xRel = this.rawMouseX - rect.left;
            const yRel = this.rawMouseY - rect.top;

            this.keys.mouseX = xRel * (CONSTANTS.WORLD_WIDTH / rect.width);
            this.keys.mouseY = yRel * (CONSTANTS.WORLD_HEIGHT / rect.height);
        }
        return this.keys;
    }
}

const INPUT = new InputController();
