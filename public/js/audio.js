class AudioEngine {
    constructor() {
        this.sounds = {
            shoot: new Audio("/sounds/metal-pipe.mp3"),
            score: new Audio("/sounds/score.mp3"),
            stun: new Audio("/sounds/stun.mp3"),
        };

        Object.values(this.sounds).forEach((audio) => (audio.volume = 0.1));
    }

    play(soundName) {
        const soundClone = this.sounds[soundName].cloneNode();
        soundClone.volume = this.sounds[soundName].volume;

        soundClone.play().catch((err) => {
            console.warn("Browser blocked audio. Click the screen first!");
        });
    }
}

const AUDIO = new AudioEngine();
