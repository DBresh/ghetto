class GameRenderer {
    constructor() {
        // DOM Elements
        this.arena = document.getElementById("game-arena");
        this.timerEl = document.getElementById("timer");
        this.scoreboardEl = document.getElementById("scoreboard");
        this.reloadBar = document.getElementById("reload-bar");
        this.hpBar = document.getElementById("hp-bar");

        // State Memories
        this.previousScores = {};
        this.domPowerUps = {};

        this.initBulletPool();
    }

    initBulletPool() {
        for (let i = 0; i < STATE.MAX_BULLETS; i++) {
            const el = document.createElement("div");
            el.classList.add("entity", "bullet");
            el.style.display = "none";
            this.arena.appendChild(el);
            STATE.bulletPool.push(el);
        }
    }

    buildObstacles(obstaclesData) {
        obstaclesData.forEach((obs) => {
            const el = document.createElement("div");
            el.style.position = "absolute";
            el.style.left = `${obs.x}px`;
            el.style.top = `${obs.y}px`;
            el.style.width = `${obs.w}px`;
            el.style.height = `${obs.h}px`;
            el.style.backgroundColor = obs.color;
            el.style.border = "2px solid #222";
            el.style.boxShadow = "inset 0 0 20px rgba(0,0,0,0.8)";
            el.style.zIndex = 5;
            this.arena.appendChild(el);
        });
    }

    start() {
        // We use an arrow function here to preserve 'this' context
        const loop = () => {
            if (STATE.serverState) {
                this.renderUI();
                this.renderPlayers();
                this.cleanupDisconnectedPlayers();
                this.renderBullets();
                this.renderRelics();
                this.updateCamera();
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    renderUI() {
        if (STATE.serverState.timeLeft !== undefined) {
            const m = Math.floor(STATE.serverState.timeLeft / 60);
            const s = STATE.serverState.timeLeft % 60;
            this.timerEl.innerText = STATE.serverState.isGameOver
                ? "GAME OVER"
                : `${m}:${s < 10 ? "0" : ""}${s}`;
        }

        let scoreHTML = "<strong>Scores:</strong><br>";
        const sortedPlayers = Object.values(
            STATE.serverState.players || {},
        ).sort((a, b) => b.score - a.score);
        sortedPlayers.forEach((p, index) => {
            const isMe =
                typeof socket !== "undefined" && p.id === socket.id
                    ? " (You)"
                    : "";
            scoreHTML += `<span style="color: ${p.color}">Player ${index + 1}${isMe}: ${p.score}</span><br>`;
        });
        this.scoreboardEl.innerHTML = scoreHTML;

        if (
            typeof socket !== "undefined" &&
            STATE.serverState.players[socket.id]
        ) {
            const myTank = STATE.serverState.players[socket.id];

            const hpPercent = Math.max(0, myTank.hp / CONSTANTS.MAX_HP);
            this.hpBar.style.transform = `scaleX(${hpPercent})`;

            const timeSinceShot = Date.now() - STATE.lastShotTime;
            let reloadPercent = Math.min(
                1,
                timeSinceShot / CONSTANTS.FIRE_COOLDOWN,
            );
            this.reloadBar.style.transform = `scaleX(${reloadPercent})`;
        }
    }

    renderPlayers() {
        for (const id in STATE.serverState.players) {
            const p = STATE.serverState.players[id];

            if (
                this.previousScores[id] !== undefined &&
                p.score > this.previousScores[id]
            ) {
                if (typeof AUDIO !== "undefined") AUDIO.play("score");
            }
            this.previousScores[id] = p.score;

            if (!STATE.playerElements[id]) {
                const el = document.createElement("div");
                el.classList.add("entity", "player-wrapper");
                el.style.width = `${CONSTANTS.PLAYER_SIZE}px`;
                el.style.height = `${CONSTANTS.PLAYER_SIZE}px`;

                const base = document.createElement("div");
                base.classList.add("tank-base");
                base.style.backgroundColor = p.color;
                base.style.transition = "box-shadow 0.2s ease";

                const turret = document.createElement("div");
                turret.classList.add("tank-turret");

                // Build all three barrels
                const bCenter = document.createElement("div");
                bCenter.classList.add("tank-barrel", "barrel-center");
                const bLeft = document.createElement("div");
                bLeft.classList.add("tank-barrel", "barrel-left");
                const bRight = document.createElement("div");
                bRight.classList.add("tank-barrel", "barrel-right");

                turret.appendChild(bCenter);
                turret.appendChild(bLeft);
                turret.appendChild(bRight);
                el.appendChild(base);
                el.appendChild(turret);

                this.arena.appendChild(el);
                STATE.playerElements[id] = {
                    root: el,
                    base: base,
                    turret: turret,
                    bCenter,
                    bLeft,
                    bRight,
                };
            }

            const domObj = STATE.playerElements[id];
            domObj.root.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
            domObj.base.style.transform = `rotate(${p.baseAngle}rad)`;
            domObj.turret.style.transform = `rotate(${p.turretAngle}rad)`;

            // --- VISUAL BUFFS ---
            // 1. Double Barrel Toggle
            domObj.bCenter.style.display = p.hasDoubleBarrel ? "none" : "block";
            domObj.bLeft.style.display = p.hasDoubleBarrel ? "block" : "none";
            domObj.bRight.style.display = p.hasDoubleBarrel ? "block" : "none";

            // 2. Auras (Applied to the rotating base, preserving the CSS inset shadow!)
            const baseShadow = "inset 0 0 10px rgba(0,0,0,0.5)";

            if (p.shieldCharges > 0) {
                domObj.base.style.boxShadow = `${baseShadow}, 0 0 20px 8px cyan`;
            } else if (p.hasSpeed) {
                domObj.base.style.boxShadow = `${baseShadow}, 0 0 15px 5px blue`;
            } else {
                domObj.base.style.boxShadow = baseShadow; // Reset back to default 3D depth
            }
        }
    }

    cleanupDisconnectedPlayers() {
        for (const domId in STATE.playerElements) {
            if (!STATE.serverState.players[domId]) {
                STATE.playerElements[domId].root.remove();
                delete STATE.playerElements[domId];
                delete this.previousScores[domId]; // Clear memory
            }
        }
    }

    renderBullets() {
        const activeBullets = STATE.serverState.bullets || [];
        for (let i = 0; i < STATE.MAX_BULLETS; i++) {
            const domBullet = STATE.bulletPool[i];
            const serverBullet = activeBullets[i];

            if (serverBullet) {
                domBullet.style.display = "block";
                domBullet.style.transform = `translate3d(${serverBullet.x}px, ${serverBullet.y}px, 0)`;
            } else {
                if (domBullet.style.display !== "none")
                    domBullet.style.display = "none";
            }
        }
    }

    renderRelics() {
        // Renamed function to act on powerUps
        const activePowerUps = STATE.serverState.powerUps || [];
        const activeIds = new Set();

        activePowerUps.forEach((pu) => {
            activeIds.add(pu.id);

            if (!this.domPowerUps[pu.id]) {
                const el = document.createElement("div");
                el.classList.add("entity");
                el.style.width = `${CONSTANTS.POWERUP_SIZE}px`;
                el.style.height = `${CONSTANTS.POWERUP_SIZE}px`;
                el.style.borderRadius = "4px";
                el.style.border = "2px solid white";

                // Color code the boxes
                if (pu.type === "RELIC") el.style.backgroundColor = "gold";
                if (pu.type === "SPEED") el.style.backgroundColor = "blue";
                if (pu.type === "DOUBLE_BARREL")
                    el.style.backgroundColor = "red";
                if (pu.type === "SHIELD") el.style.backgroundColor = "cyan";

                this.arena.appendChild(el);
                this.domPowerUps[pu.id] = el;
            }

            this.domPowerUps[pu.id].style.transform =
                `translate3d(${pu.x}px, ${pu.y}px, 0)`;
        });

        for (const domId in this.domPowerUps) {
            if (!activeIds.has(domId)) {
                this.domPowerUps[domId].remove();
                delete this.domPowerUps[domId];
            }
        }
    }

    updateCamera() {
        if (
            typeof socket !== "undefined" &&
            STATE.serverState.players[socket.id]
        ) {
            const myTank = STATE.serverState.players[socket.id];
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            const cameraX =
                screenCenterX - myTank.x - CONSTANTS.PLAYER_SIZE / 2;
            const cameraY =
                screenCenterY - myTank.y - CONSTANTS.PLAYER_SIZE / 2;

            this.arena.style.transform = `translate3d(${cameraX}px, ${cameraY}px, 0)`;
        }
    }
}

// Instantiate globally
const RENDERER = new GameRenderer();
