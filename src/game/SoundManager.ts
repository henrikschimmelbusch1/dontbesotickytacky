export class SoundManager {
    private context: AudioContext | null = null;

    constructor() {
        try {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
        if (!this.context) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.context.currentTime + startTime);

        gain.gain.setValueAtTime(0.1, this.context.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.context.destination);

        osc.start(this.context.currentTime + startTime);
        osc.stop(this.context.currentTime + startTime + duration);
    }

    public playMove() {
        this.playTone(600, 'sine', 0.1);
    }

    public playInvalid() {
        this.playTone(150, 'sawtooth', 0.2);
    }

    public playWinSmall() {
        this.playTone(400, 'sine', 0.3, 0);
        this.playTone(600, 'sine', 0.3, 0.1);
        this.playTone(800, 'sine', 0.4, 0.2);
    }

    public playWinMedium() {
        this.playTone(300, 'square', 0.4, 0);
        this.playTone(450, 'square', 0.4, 0.1);
        this.playTone(600, 'square', 0.6, 0.2);
    }

    public playWinGame() {
        [440, 554, 659, 880].forEach((freq, i) => {
            this.playTone(freq, 'triangle', 0.5, i * 0.15);
        });
    }
}

export const soundManager = new SoundManager();
