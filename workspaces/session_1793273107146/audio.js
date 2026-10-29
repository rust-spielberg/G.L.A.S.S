class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
        this._resumeOnInteraction();
    }

    _resumeOnInteraction() {
        const resume = () => {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            document.removeEventListener('click', resume);
            document.removeEventListener('keydown', resume);
        };
        document.addEventListener('click', resume);
        document.addEventListener('keydown', resume);
    }

    _createOscillator(type, freq, startTime, duration) {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        osc.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration);
        return osc;
    }

    playLaser() {
        const now = this.ctx.currentTime;
        const osc = this._createOscillator('square', 800, now, 0.15);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.disconnect();
        osc.connect(gain).connect(this.masterGain);
    }

    playExplosion() {
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        noise.connect(filter).connect(gain).connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.3);
    }

    playPowerup() {
        const now = this.ctx.currentTime;
        const notes = [400, 600, 800];
        notes.forEach((freq, i) => {
            const osc = this._createOscillator('sawtooth', freq, now + i * 0.07, 0.12);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.15, now + i * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.12);
            osc.disconnect();
            osc.connect(gain).connect(this.masterGain);
        });
    }

    playGameOver() {
        const now = this.ctx.currentTime;
        const osc = this._createOscillator('sine', 400, now, 2);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        osc.disconnect();
        osc.connect(gain).connect(this.masterGain);
    }
}
window.audioEngine = new AudioEngine();