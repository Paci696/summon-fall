// Music.js - a small synthesized chiptune loop (no audio files).
// Calm layer: pad + bass + soft arpeggio. Battle layer (fades in with setIntensity): drums + lead melody.
// The whole loop is 4 bars of A minor: Am - F - C - G.

const STEP = 0.15;            // one 16th note at 100 bpm
const LOOP = 64;              // steps in the loop
const VOLUME = 0.2;

const CHORDS = [
    { root: 110.0, third: 3 },    // A minor
    { root: 87.31, third: 4 },    // F
    { root: 130.81, third: 4 },   // C
    { root: 98.0, third: 4 },     // G
];

// Lead notes in semitones above A4 (440 Hz); null = rest
const LEAD = [
    0, null, 3, null, 7, null, 3, null, 0, null, 3, null, 5, null, 3, null,
    8, null, 12, null, 8, null, 3, null, 8, null, 12, null, 10, null, 8, null,
    7, null, 10, null, 15, null, 10, null, 7, null, 10, null, 12, null, 10, null,
    5, null, 10, null, 14, null, 10, null, 7, null, 5, null, 2, null, 5, null,
];

const semi = (f, n) => f * Math.pow(2, n / 12);

export class Music {
    constructor() {
        this.ctx = null;
        this.timer = null;
        this.step = 0;
        this.nextTime = 0;
        this.muted = false;
        this.paused = false;
        this.stopped = false;
        this.intensity = 0;
    }

    start() {
        if (this.ctx || this.stopped) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try {
            this.ctx = new AC();
        } catch (e) {
            return;
        }
        const ctx = this.ctx;
        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : VOLUME;
        this.master.connect(ctx.destination);
        this.calm = ctx.createGain();
        this.battle = ctx.createGain();
        this.battle.gain.value = 0;
        this.calm.connect(this.master);
        this.battle.connect(this.master);

        const len = Math.floor(ctx.sampleRate * 0.5);
        this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

        this.nextTime = ctx.currentTime + 0.1;
        this.timer = setInterval(() => this.schedule(), 60);

        // browsers keep audio suspended until the player clicks or presses a key
        const resume = () => {
            if (this.ctx && this.ctx.state === 'suspended' && !this.paused && !this.stopped) this.ctx.resume();
        };
        window.addEventListener('pointerdown', resume);
        window.addEventListener('keydown', resume);
        resume();
    }

    setMuted(m) {
        if (m === this.muted) return;
        this.muted = m;
        if (this.master) this.master.gain.setTargetAtTime(m ? 0 : VOLUME, this.ctx.currentTime, 0.05);
    }

    setIntensity(v) {
        v = Math.max(0, Math.min(1, v));
        if (Math.abs(v - this.intensity) < 0.02) return;
        this.intensity = v;
        if (this.battle) this.battle.gain.setTargetAtTime(v, this.ctx.currentTime, 0.6);
    }

    setPaused(p) {
        if (p === this.paused || !this.ctx || this.stopped) return;
        this.paused = p;
        if (p) this.ctx.suspend(); else this.ctx.resume();
    }

    stop() {
        if (!this.ctx || this.stopped) return;
        this.stopped = true;
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
        clearInterval(this.timer);
        setTimeout(() => { try { this.ctx.close(); } catch (e) { /* already closed */ } }, 2000);
    }

    // ---- scheduling ----

    schedule() {
        const ctx = this.ctx;
        if (!ctx || ctx.state !== 'running') return;
        if (this.nextTime < ctx.currentTime - 0.1) this.nextTime = ctx.currentTime + 0.05; // tab was in the background
        while (this.nextTime < ctx.currentTime + 0.4) {
            this.playStep(this.step, this.nextTime);
            this.nextTime += STEP;
            this.step = (this.step + 1) % LOOP;
        }
    }

    playStep(step, t) {
        const chord = CHORDS[Math.floor(step / 16)];
        const s16 = step % 16;
        const tones = [chord.root, semi(chord.root, chord.third), semi(chord.root, 7)];

        // calm layer
        if (s16 === 0) {
            for (const f of tones) this.tone('triangle', f * 2, t, STEP * 15, 0.05, this.calm, 0.35);
        }
        if (s16 % 4 === 0) this.tone('triangle', chord.root, t, STEP * 3.2, 0.2, this.calm);
        else if (s16 % 4 === 2) this.tone('triangle', chord.root * 2, t, STEP * 1.5, 0.1, this.calm);
        const arp = [0, 1, 2, 1][step % 4];
        this.tone('square', tones[arp] * 4, t, STEP * 1.4, 0.035, this.calm);

        // battle layer
        if (s16 % 8 === 0 || s16 === 10) this.kick(t);
        if (s16 % 8 === 4) this.noise(t, 0.13, 0.22, 1800);
        if (step % 2 === 0) this.noise(t, 0.04, 0.07, 7000);
        const n = LEAD[step];
        if (n !== null) this.tone('square', semi(440, n), t, STEP * 1.8, 0.07, this.battle);
    }

    tone(type, freq, t, dur, vol, dest, attack = 0.006) {
        const ctx = this.ctx;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(dest);
        o.start(t);
        o.stop(t + dur + 0.03);
    }

    kick(t) {
        const ctx = this.ctx;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        g.gain.setValueAtTime(0.55, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g);
        g.connect(this.battle);
        o.start(t);
        o.stop(t + 0.2);
    }

    noise(t, dur, vol, highpass) {
        const ctx = this.ctx;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = highpass;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f);
        f.connect(g);
        g.connect(this.battle);
        src.start(t);
        src.stop(t + dur + 0.02);
    }
}