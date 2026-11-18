export class Sfx {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.last = {};
        try { this.muted = localStorage.getItem('sf_muted') === '1'; } catch (e) { /* ignore */ }
    }

    toggle() {
        this.muted = !this.muted;
        try { localStorage.setItem('sf_muted', this.muted ? '1' : '0'); } catch (e) { /* ignore */ }
    }

    audio() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    tone(type, f0, f1, dur, vol) {
        const a = this.audio();
        if (!a) return;
        const t = a.currentTime;
        const osc = a.createOscillator();
        const gain = a.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain);
        gain.connect(a.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    play(name) {
        if (this.muted) return;
        const now = performance.now();
        const gap = { hit: 70, coin: 120, die: 80 }[name] || 0; // stops rapid repeats from getting noisy
        if (gap && now - (this.last[name] || 0) < gap) return;
        this.last[name] = now;
        try {
            switch (name) {
                case 'summon': this.tone('square', 300, 700, 0.15, 0.05); break;
                case 'coin':   this.tone('square', 900, 1300, 0.08, 0.03); break;
                case 'hit':    this.tone('sawtooth', 220, 90, 0.07, 0.04); break;
                case 'die':    this.tone('triangle', 260, 60, 0.25, 0.06); break;
                case 'cast':   this.tone('sawtooth', 700, 90, 1.1, 0.04); break;
                case 'boom':   this.tone('sine', 120, 25, 0.6, 0.18); this.tone('square', 90, 30, 0.3, 0.06); break;
            }
        } catch (e) { /* sound is optional */ }
    }
}