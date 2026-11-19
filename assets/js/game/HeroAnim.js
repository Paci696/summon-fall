// HeroAnim.js - gives every hero real animation frames (idle / walk / attack) built from the hero's own art.
// Frames are baked ONCE into a sheet, so there is no per-frame cost. Each hero also gets its own aura + motes.
// Same interface as SpriteSkin: play(name) / update(ms) / draw(ctx, x, feetY, flip) / height.
import { getHeroSheet } from './HeroArt.js';
import { getRedrawnHero } from './HeroRedraw.js';

const FRAMES = { idle: 4, walk: 4, attack: 4 };
const ORDER = ['idle', 'walk', 'attack'];
const SPEED = { idle: 220, walk: 110, attack: 90 };

// aura / mote / slash colours per hero
const LOOK = {
    hero_knight:     { aura: '#ffd24a', mote: '#fff4b0', slash: 'rgba(255,240,170,.9)', kind: 'arc' },
    hero_archer:     { aura: '#5fe08a', mote: '#c8ffd8', slash: 'rgba(200,255,220,.9)', kind: 'shot' },
    hero_mage:       { aura: '#9a7cff', mote: '#d8ccff', slash: 'rgba(190,170,255,.9)', kind: 'burst' },
    hero_lycan:      { aura: '#ffb347', mote: '#ffe0a0', slash: 'rgba(255,210,150,.9)', kind: 'claw' },
    hero_lycan_wolf: { aura: '#ff5a5a', mote: '#ffb0b0', slash: 'rgba(255,120,120,.9)', kind: 'claw' },
    hero_necromancer:{ aura: '#7dffb0', mote: '#d0a0ff', slash: 'rgba(160,255,200,.9)', kind: 'burst' },
};

function make(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    return { c, g };
}

// vertical extent of the non-transparent pixels of a cell
function bounds(src, sx, cell) {
    const { c, g } = make(cell, cell);
    g.drawImage(src, sx, 0, cell, cell, 0, 0, cell, cell);
    const d = g.getImageData(0, 0, cell, cell).data;
    let top = cell, bot = 0, left = cell, right = 0;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) if (d[(y * cell + x) * 4 + 3] > 40) {
        if (y < top) top = y; if (y > bot) bot = y; if (x < left) left = x; if (x > right) right = x;
    }
    return { top, bot, left, right, h: bot - top + 1 };
}

function pose(anim, i) {
    if (anim === 'idle')   return { dy: [0, -1, -1, 0][i], sq: [0, 0, 1, 0][i], lean: 0, step: 0, atk: -1 };
    if (anim === 'walk')   return { dy: [0, -1, 0, -1][i], sq: 0, lean: 1, step: [1, 0, -1, 0][i], atk: -1 };
    return { dy: [0, 0, 1, 0][i], sq: 0, lean: [-2, -1, 4, 1][i], step: 0, atk: i / 3 };   // wind up, strike, recover
}

const cache = {};
export function getHeroFrames(key) {
    if (cache[key] !== undefined) return cache[key];
    const redrawn = getRedrawnHero(key);                      // brand new art (HeroRedraw.js)
    if (redrawn) return (cache[key] = redrawn);
    const sheet = getHeroSheet();
    const spot = sheet.units[key];
    if (!spot) return (cache[key] = null);
    const cell = sheet.cell, sx = spot.right[0] * cell;
    const b = bounds(sheet.canvas, sx, cell);
    const hipY = b.top + Math.round(b.h * 0.7);                 // below this = legs
    const midX = Math.round((b.left + b.right) / 2);
    const total = ORDER.reduce((a, k) => a + FRAMES[k], 0);
    const out = make(cell * total, cell);
    const index = {};
    let col = 0;
    for (const anim of ORDER) {
        index[anim] = [];
        for (let i = 0; i < FRAMES[anim]; i++) {
            const p = pose(anim, i);
            const f = make(cell, cell), g = f.g;
            // legs: alternate halves lift when walking
            g.drawImage(sheet.canvas, sx, hipY, midX, cell - hipY, 0, hipY - (p.step > 0 ? 1 : 0), midX, cell - hipY);
            g.drawImage(sheet.canvas, sx + midX, hipY, cell - midX, cell - hipY, midX, hipY - (p.step < 0 ? 1 : 0), cell - midX, cell - hipY);
            // upper body: bob, breathe (stretch 1px), lean into the attack
            const bodyH = hipY - b.top + 1;
            const sh = bodyH + p.sq;
            g.drawImage(sheet.canvas, sx, b.top, cell, bodyH + 1, p.lean, b.top - p.dy - p.sq, cell, sh + 1);
            // attack effect
            const L = LOOK[key];
            if (p.atk >= 0.3 && L) {
                g.fillStyle = L.slash;
                const cx = b.right + 1 + p.lean, cy = b.top + Math.round(b.h * 0.4);
                if (L.kind === 'arc') for (let a = -1.2; a < 1.1; a += 0.2) g.fillRect(Math.round(cx + Math.cos(a) * 9), Math.round(cy + Math.sin(a) * 11), 2, 2);
                else if (L.kind === 'claw') for (let k = -1; k <= 1; k++) for (let s = 0; s < 8; s++) g.fillRect(cx + s, cy + k * 4 + s, 2, 1);
                else if (L.kind === 'shot') for (let s = 0; s < 9; s++) g.fillRect(cx + s * 2, cy, 2, 1);
                else for (let a = 0; a < 7; a++) g.fillRect(Math.round(cx + 3 + Math.cos(a * 0.9) * (3 + p.atk * 7)), Math.round(cy + Math.sin(a * 0.9) * (3 + p.atk * 7)), 2, 2);
            }
            out.g.drawImage(f.c, col * cell, 0);
            index[anim].push(col++);
        }
    }
    return (cache[key] = { canvas: out.c, cell, index, key, top: b.top, feet: b.bot, h: b.h });
}

export class HeroAnimator {
    constructor(frames) {
        this.f = frames; this.anim = 'idle'; this.t = Math.random() * 800; this.s = Math.random() * 6;
        this.height = frames.h + 4;
    }
    play(n) { if (!this.f.index[n]) n = 'idle'; if (n !== this.anim) { this.anim = n; this.t = 0; } }
    update(ms) { this.t += ms; this.s += ms / 1000; }
    draw(ctx, x, y, flip, scale = 1) {
        const f = this.f, list = f.index[this.anim], i = Math.floor(this.t / SPEED[this.anim]) % list.length;
        const L = LOOK[f.key] || LOOK.hero_knight, sz = f.cell * scale;
        ctx.save();
        ctx.globalAlpha = 0.22 + 0.1 * Math.sin(this.s * 3); ctx.fillStyle = L.aura;       // ground glow
        ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 17 * scale, 6 * scale, 0, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 1;
        if (flip) { ctx.translate(Math.round(x) * 2, 0); ctx.scale(-1, 1); }
        ctx.drawImage(f.canvas, list[i] * f.cell, 0, f.cell, f.cell, Math.round(x - sz / 2), Math.round(y - (f.feet + 1) * scale), sz, sz);
        ctx.restore();
        ctx.save();
        for (let k = 0; k < 4; k++) {                                                       // drifting motes
            const ph = (this.s * 0.7 + k / 4) % 1;
            ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9; ctx.fillStyle = k % 2 ? L.mote : L.aura;
            ctx.fillRect(Math.round(x + Math.sin(this.s * 1.6 + k * 2) * 14 * scale), Math.round(y - 6 - ph * 40 * scale), 2, 2);
        }
        ctx.restore();
        return true;
    }
}