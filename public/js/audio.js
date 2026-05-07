class AudioEngine {
    constructor() {
        this.audioCtx = null;
        this.buffers = {};
        this.initialized = false;

        const initAudio = async () => {
            if (this.initialized) return;
            this.initialized = true;

            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            await Promise.all([
                this.loadSound("shoot", "/sounds/shot.mp3"),
                this.loadSound("score", "/sounds/score.mp3"),
                this.loadSound("bgm", "/sounds/music.mp3"),
            ]);

            this.playLoop("bgm", 0.01);

            document.removeEventListener("mousedown", initAudio);
            document.removeEventListener("keydown", initAudio);
        };

        document.addEventListener("mousedown", initAudio);
        document.addEventListener("keydown", initAudio);
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            this.buffers[name] = audioBuffer;
        } catch (e) {
            console.warn(`Failed to load audio: ${url}`, e);
        }
    }

    play3D(soundName, x, y, listenerX, listenerY, maxVolume = 0.05) {
        if (!this.initialized || !this.buffers[soundName]) return;
        if (this.audioCtx.state === "suspended") this.audioCtx.resume();

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.buffers[soundName];

        const gainNode = this.audioCtx.createGain();

        const maxDist = 2000;
        const dist = Math.hypot(x - listenerX, y - listenerY);
        const volume = Math.max(0, 1 - dist / maxDist) * maxVolume;

        gainNode.gain.value = volume;

        let pan = (x - listenerX) / 600;
        pan = Math.max(-1, Math.min(1, pan));

        if (this.audioCtx.createStereoPanner) {
            const panner = this.audioCtx.createStereoPanner();
            panner.pan.value = pan;
            source.connect(panner);
            panner.connect(gainNode);
        } else {
            source.connect(gainNode);
        }

        gainNode.connect(this.audioCtx.destination);
        source.start(0);
    }

    play(soundName) {
        if (!this.initialized || !this.buffers[soundName]) return;
        if (this.audioCtx.state === "suspended") this.audioCtx.resume();

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.buffers[soundName];

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0.05;

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);
    }

    playLoop(soundName, volume = 0.05) {
        if (!this.buffers[soundName]) return;
        if (this.audioCtx.state === "suspended") this.audioCtx.resume();

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.buffers[soundName];
        source.loop = true;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);
    }
}

const AUDIO = new AudioEngine();
