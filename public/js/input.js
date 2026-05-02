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

        window.addEventListener("mousedown", () => {
            // Safety check: Don't shoot if we are dead or don't exist yet
            const myTank =
                typeof socket !== "undefined"
                    ? STATE.serverState.players[socket.id]
                    : null;
            if (myTank && myTank.hp <= 0) return;

            // Enforce local cooldown
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
        // If we are typing in chat, completely ignore new key presses!
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

    // Called by main.js every tick to get the freshest data
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

// Instantiate it globally for the network to use
const INPUT = new InputController();
