// EliteArt.js - Elite and Godly units get their OWN hand-coded art, with real animation frames:
// idle (4), walk (4) and attack (4) for Miner, Swordsman, Archer, Mage and Healer.
// Everything is painted once into a sprite sheet; RankAnimator just picks frames, so it stays fast.
// RankAnimator has the same interface as SpriteSkin (play / update / draw / height).

const CELL = 40;
const FEET = 37;                       // row where the boots end
const INK = '#14101e';
const FRAMES = { idle: 4, walk: 4, attack: 4 };
const ORDER = ['idle', 'walk', 'attack'];

function make(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c, g };
}
const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };

function blob(g, cx, cy, rx, ry, P) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
            const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
            if (u * u + v * v > 1) continue;
            const light = -(0.6 * u + 0.8 * v);
            let col = P[1];
            if (light > 0.62) col = (x + y) % 2 === 0 ? P[3] : P[2];
            else if (light > 0.22) col = P[2];
            else if (light < -0.5) col = P[0];
            R(g, x, y, 1, 1, col);
        }
    }
}

// 1px-wide (or thicker) pixel line
function line(g, x0, y0, x1, y1, col, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
        R(g, x0, y0, w, w, col);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

function outline(g, w, h, col) {
    const d = g.getImageData(0, 0, w, h).data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) add.push([x, y]);
    }
    g.fillStyle = col;
    for (const [x, y] of add) g.fillRect(x, y, 1, 1);
}

const SKIN = '#f1c7a0', SKIN_D = '#d19a72', EYE = '#14101e';

// palettes: metal = [dark, base, light, shine]
const PAL = {
    0: { metal: ['#3e3e4c', '#6e7384', '#9aa0b4', '#c8cddc'], trim: '#c9a24a', trimD: '#8a6a22', cape: '#8a3030', capeD: '#5a1c1c', boot: '#3a2e26', pants: '#4a4a5a', glow: '#ffe9a0', cloth: ['#5a4a3a', '#8a7358', '#b39a78'] },
    1: { metal: ['#3d4864', '#6f7fa6', '#a9b9de', '#e6efff'], trim: '#4fc3ff', trimD: '#2a86c0', cape: '#2a50c8', capeD: '#1a3490', boot: '#2b3248', pants: '#32406a', glow: '#8fe0ff', cloth: ['#2a3b8a', '#3f56c8', '#6b86f0'] },
    2: { metal: ['#8a5a10', '#d9a21c', '#ffd24a', '#fff4b0'], trim: '#ffffff', trimD: '#e8c860', cape: '#f4eeff', capeD: '#c9b8f0', boot: '#6a4408', pants: '#f0e8ff', glow: '#fff0a0', cloth: ['#b8a0f0', '#f4eeff', '#ffffff'] },
};

// ---------- shared pieces ----------

function legs(g, p, P) {
    const s = p.step;
    const a = Math.round(s * 2), lift = s > 0.5 ? 1 : 0, lift2 = s < -0.5 ? 1 : 0;
    // back leg
    R(g, 15 - a, 29, 4, 6 - lift2, P.pants);
    R(g, 14 - a, 35 - lift2, 5, 3, P.boot); R(g, 14 - a, 35 - lift2, 5, 1, P.metal[1]);
    // front leg
    R(g, 21 + a, 29, 4, 6 - lift, P.pants);
    R(g, 21 + a, 35 - lift, 6, 3, P.boot); R(g, 21 + a, 35 - lift, 6, 1, P.metal[1]);
}

function wings(g, p, P, rk) {
    if (rk < 2) return;
    const flap = Math.sin(p.sway * Math.PI * 2);
    const lift = Math.round(flap * 3);
    const cols = ['#fff6d0', '#ffe9a0', '#ffffff'];
    for (let i = 0; i < 5; i++) {          // feathers fanning up and back
        const len = 11 - i * 1.4;
        const ang = -2.2 - i * 0.22 - flap * 0.18;
        const x1 = 17 + Math.cos(ang) * len * 1.3, y1 = 22 + Math.sin(ang) * len + lift;
        line(g, 17, 23 - i, x1, y1 + i, cols[i % 3], 2);
    }
    for (let i = 0; i < 4; i++) {          // far wing, shorter
        const len = 8 - i * 1.2;
        const ang = -2.0 - i * 0.25 - flap * 0.18;
        line(g, 23, 22, 23 + Math.cos(ang) * -len, 22 + Math.sin(ang) * len + lift, '#e8dcff', 2);
    }
}

function cape(g, p, P) {
    const sw = Math.round(Math.sin(p.sway * Math.PI * 2) * 1.5 + p.step * -1.5);
    for (let y = 19; y < 33; y++) {
        const w = 3 + Math.floor((y - 19) / 3);
        const x = 14 - w + Math.round(sw * (y - 19) / 12);
        R(g, x, y, w + 1, 1, y > 27 ? P.capeD : P.cape);
    }
}

function halo(g, p, P) {
    const y = 1 + Math.round(Math.sin(p.sway * Math.PI * 2) * 0.6);
    R(g, 15, y, 10, 1, '#ffe680'); R(g, 14, y + 1, 1, 1, '#ffe680'); R(g, 25, y + 1, 1, 1, '#ffe680');
    R(g, 16, y + 2, 8, 1, '#d9a21c'); R(g, 16, y, 3, 1, '#ffffff');
}

// torso block with shoulders; hip belt at y=28
function torso(g, P, opts = {}) {
    const m = P.metal;
    R(g, 14, 18, 12, 11, m[1]);
    R(g, 14, 18, 3, 11, m[2]);
    R(g, 23, 18, 3, 11, m[0]);
    R(g, 14, 27, 12, 2, opts.belt || '#6e4a22');
    R(g, 19, 27, 2, 2, P.trim);
    R(g, 19, 20, 2, 5, P.trim);                // chest emblem
    R(g, 17, 22, 6, 1, P.trim);
    blob(g, 14, 19, 3.2, 2.6, m);              // pauldrons
    blob(g, 26, 19, 3.2, 2.6, m);
}

// ---------- the five units (all facing right) ----------

function swordsman(g, rk, p) {
    const P = PAL[rk], m = P.metal;
    wings(g, p, P, rk);
    g.save(); g.translate(0, -p.bob);
    cape(g, p, P);
    // kite shield on the back arm
    for (let y = 0; y < 11; y++) { const w = 6 - Math.max(0, y - 6); R(g, 10 - Math.floor(w / 2) - 1, 18 + y, w + 2, 1, y < 2 ? m[3] : (y % 4 ? m[1] : m[0])); }
    R(g, 9, 21, 3, 5, P.trim);
    g.restore();
    legs(g, p, P);
    g.save(); g.translate(0, -p.bob);
    torso(g, P);
    // helmet
    blob(g, 20, 10, 6.4, 6.4, m);
    R(g, 20, 9, 6, 3, '#14101e'); R(g, 21, 10, 4, 1, rk === 2 ? '#fff0a0' : (rk === 1 ? '#8fe0ff' : '#c8cddc'));  // visor slit
    if (rk === 0) { R(g, 18, 3, 4, 2, '#8a3030'); }
    else if (rk === 1) { R(g, 13, 3, 7, 2, '#d23b3b'); R(g, 11, 5, 4, 3, '#a02828'); R(g, 18, 2, 5, 2, '#ff6a5a'); }          // plume
    else { R(g, 11, 6, 4, 2, '#ffffff'); R(g, 9, 4, 4, 2, '#fff4b0'); R(g, 7, 2, 4, 2, '#ffe680'); halo(g, p, P); R(g, 19, 3, 2, 3, '#fff'); }
    // sword + arm
    const s = p.swing;
    const ang = s < 0 ? (-75 + Math.sin(p.sway * 6.28) * 4) : (-140 + 175 * s) ;     // up-back -> forward-down
    const rad = ang * Math.PI / 180, hx = 28, hy = 23 - (s >= 0 && s < 0.4 ? 3 : 0);
    const len = rk === 2 ? 17 : 14;
    R(g, 25, 19, 4, 5, m[1]); R(g, 28, hy - 1, 3, 3, SKIN);
    const tx = hx + Math.cos(rad) * len, ty = hy + Math.sin(rad) * len;
    line(g, hx, hy, tx, ty, rk === 2 ? '#fff4b0' : '#e8f0ff', 2);
    line(g, hx + 1, hy, tx + 1, ty, rk === 2 ? '#ffd24a' : '#9fb0d8', 1);
    line(g, hx - 2 * Math.sin(rad), hy + 2 * Math.cos(rad), hx + 2 * Math.sin(rad), hy - 2 * Math.cos(rad), '#ffd24a', 1);      // crossguard
    if (rk === 2) for (let i = 0; i < 4; i++) R(g, tx + (i % 2) - 1, ty - i * 2, 1, 1, '#ffffff');
    if (s >= 0.3 && s <= 0.9) {                                                   // slash trail
        for (let a = ang - 70; a < ang; a += 9) { const r2 = a * Math.PI / 180; R(g, hx + Math.cos(r2) * (len - 1), hy + Math.sin(r2) * (len - 1), 2, 2, rk === 2 ? 'rgba(255,240,170,.85)' : 'rgba(170,230,255,.85)'); }
    }
    g.restore();
}

function archer(g, rk, p) {
    const P = PAL[rk], m = P.metal;
    const hood = rk === 2 ? ['#c9b8f0', '#f4eeff', '#ffffff', '#ffffff'] : ['#14452c', '#1f7a48', '#3fbf6a', '#7fe8a0'];
    wings(g, p, P, rk);
    g.save(); g.translate(0, -p.bob);
    cape(g, p, { ...P, cape: rk === 2 ? '#f4eeff' : '#1f6a3a', capeD: rk === 2 ? '#c9b8f0' : '#14452c' });
    R(g, 11, 17, 4, 11, '#6e4a22'); R(g, 11, 14, 1, 4, '#d23b3b'); R(g, 13, 13, 1, 5, '#e8e0c8'); R(g, 12, 15, 1, 3, '#e8e0c8');   // quiver
    g.restore();
    legs(g, p, { ...P, pants: rk === 2 ? '#e8dcff' : '#3a3a2a' });
    g.save(); g.translate(0, -p.bob);
    R(g, 14, 18, 12, 11, rk === 2 ? '#f4eeff' : '#1f7a48');
    R(g, 14, 18, 3, 11, rk === 2 ? '#ffffff' : '#3fbf6a'); R(g, 23, 18, 3, 11, rk === 2 ? '#c9b8f0' : '#14452c');
    R(g, 14, 27, 12, 2, '#6e4a22'); R(g, 19, 27, 2, 2, '#ffd24a');
    R(g, 14, 18, 12, 2, rk === 2 ? '#ffd24a' : '#d9b84a');                  // scarf
    blob(g, 14, 19, 3, 2.4, m); blob(g, 26, 19, 3, 2.4, m);
    // hood + face
    blob(g, 20, 10, 6.8, 6.6, hood);
    R(g, 20, 9, 5, 5, SKIN); R(g, 20, 13, 5, 1, SKIN_D); R(g, 23, 10, 1, 2, EYE);
    if (rk === 2) { R(g, 23, 10, 1, 2, '#ffe680'); halo(g, p, P); } else R(g, 12, 9, 4, 3, '#1f7a48');
    // bow
    const s = p.swing, pull = s < 0 ? 0 : Math.min(1, s / 0.55);
    const bx = 31, bowCol = rk === 2 ? '#ffe680' : '#8a5a2b', bowHi = rk === 2 ? '#ffffff' : '#b57a3c';
    for (let y = 9; y <= 31; y++) {
        const x = bx + Math.round(3 * Math.sin(((y - 9) / 22) * Math.PI));
        R(g, x, y, 1, 1, y % 3 ? bowCol : bowHi);
    }
    const sx = bx - Math.round(pull * 6);
    line(g, bx + 0, 9, sx, 20, '#e8e0c8'); line(g, sx, 20, bx + 0, 31, '#e8e0c8');       // string
    R(g, 26, 19, 4, 3, hood[1]); R(g, sx - 1, 19, 3, 3, SKIN);
    if (s < 0 || s < 0.7) line(g, sx, 20, sx + 15, 20, rk === 2 ? '#fff4b0' : '#c8b88a');           // arrow
    if (s >= 0.7) {                                                                     // released arrow flies off
        const fx = Math.min(38, 30 + (s - 0.7) * 40);
        line(g, fx - 7, 20, fx, 20, rk === 2 ? '#fff4b0' : '#c8b88a');
        R(g, fx + 1, 19, 2, 3, rk === 2 ? '#ffffff' : '#aab4c8');
    }
    g.restore();
}

function mage(g, rk, p) {
    const P = PAL[rk];
    const robe = rk === 2 ? ['#3a1a8a', '#6a3fe0', '#a888ff'] : ['#2a1a6a', '#4a2fb8', '#7a5af0'];
    wings(g, p, P, rk);
    g.save(); g.translate(0, -p.bob);
    // robe (widens to the hem; sways a little when walking)
    const sw = Math.round(p.step * 1.2);
    for (let y = 17; y <= 36; y++) {
        const half = 6 + Math.round((y - 17) * 0.28);
        const o = Math.round(sw * (y - 17) / 19);
        for (let x = 20 - half + o; x < 20 + half + o; x++) {
            const t = (x - (20 - half - o)) / (2 * half);
            R(g, x, y, 1, 1, t < 0.25 ? robe[2] : (t > 0.72 ? robe[0] : robe[1]));
        }
    }
    R(g, 13 + sw, 35, 15, 2, P.metal[2]);                                   // hem trim
    R(g, 14, 25, 12, 2, rk === 2 ? '#ffd24a' : '#8fe0ff'); R(g, 19, 25, 2, 2, '#ffffff');
    if (rk === 2) for (let i = 0; i < 9; i++) R(g, 14 + (i * 7) % 12, 19 + (i * 5) % 14, 1, 1, '#fff4b0');   // stars on the robe
    blob(g, 14, 19, 3, 2.4, P.metal); blob(g, 26, 19, 3, 2.4, P.metal);
    // face + beard
    R(g, 17, 9, 7, 6, SKIN); R(g, 22, 11, 1, 2, rk === 2 ? '#ffe680' : EYE);
    R(g, 17, 14, 7, 4, '#f2f2f2'); R(g, 18, 17, 4, 2, '#c9d2da');
    // hat
    R(g, 12, 8, 17, 2, robe[1]); R(g, 12, 8, 17, 1, robe[2]);
    for (let y = 1; y <= 7; y++) { const half = Math.round((y + 0.5) * 1.0) + 1; R(g, 19 - half + 1, y, half * 2, 1, robe[1]); R(g, 19 - half + 1, y, Math.max(1, half >> 1), 1, robe[2]); }
    R(g, 16, 7, 8, 1, '#ffd24a'); R(g, 18, 3, 2, 2, rk === 2 ? '#ffffff' : '#8fe0ff');
    if (rk === 2) halo(g, p, P);
    // staff + orb (orb flares on the attack)
    const s = p.swing, lean = s >= 0 ? Math.round(s * 2) : 0;
    R(g, 30 + lean, 12, 2, 24, '#8a5a2b'); R(g, 30 + lean, 12, 1, 24, '#b57a3c');
    R(g, 26, 22, 5, 3, robe[1]); R(g, 28 + lean, 22, 3, 3, SKIN);
    const oy = 9 + Math.round(Math.sin(p.sway * 6.28) * 1), rr = 3.4 + (s >= 0 ? s * 1.4 : 0);
    blob(g, 31 + lean, oy, rr, rr, rk === 2 ? ['#ffb020', '#ffe070', '#fff4b0', '#ffffff'] : ['#2a7ad0', '#6ac8ff', '#c0eeff', '#ffffff']);
    if (s >= 0.4) {                                                                   // spell burst
        const c = rk === 2 ? '#fff4b0' : '#aee8ff';
        for (let a = 0; a < 6; a++) { const r2 = a * 1.05 + s * 2; R(g, 31 + lean + Math.cos(r2) * (6 + s * 3), oy + Math.sin(r2) * (6 + s * 3), 2, 2, c); }
    }
    g.restore();
}

function healer(g, rk, p) {
    const P = PAL[rk];
    const cloth = rk === 2 ? ['#e8dcff', '#ffffff', '#ffffff'] : ['#c9d2da', '#f2f2f2', '#ffffff'];
    const accent = rk === 2 ? '#ffd24a' : '#4fbf6a';
    wings(g, p, P, rk);
    g.save(); g.translate(0, -p.bob);
    const sw = Math.round(p.step * 1.2);
    for (let y = 17; y <= 36; y++) {
        const half = 6 + Math.round((y - 17) * 0.26), o = Math.round(sw * (y - 17) / 19);
        for (let x = 20 - half + o; x < 20 + half + o; x++) {
            const t = (x - (20 - half - o)) / (2 * half);
            R(g, x, y, 1, 1, t < 0.25 ? cloth[2] : (t > 0.72 ? cloth[0] : cloth[1]));
        }
    }
    R(g, 13 + sw, 35, 15, 2, accent);
    R(g, 14, 25, 12, 2, accent); R(g, 19, 25, 2, 2, '#ffd84a');
    R(g, 19, 19, 2, 6, accent); R(g, 17, 21, 6, 2, accent);                  // chest cross
    blob(g, 14, 19, 3, 2.4, P.metal); blob(g, 26, 19, 3, 2.4, P.metal);
    // hood + face
    blob(g, 20, 10, 6.8, 6.6, cloth.concat(['#ffffff']));
    R(g, 20, 9, 5, 5, SKIN); R(g, 20, 13, 5, 1, SKIN_D); R(g, 23, 10, 1, 2, EYE); R(g, 24, 12, 1, 1, '#ff9aa8');
    if (rk === 1) { R(g, 16, 4, 8, 2, '#ffd24a'); R(g, 19, 1, 2, 4, '#ffd24a'); R(g, 18, 2, 4, 1, '#ffd24a'); }   // mitre cross
    else if (rk === 2) halo(g, p, P);
    // staff with glowing head: raised on the heal
    const s = p.swing, up = s >= 0 ? Math.round(Math.sin(s * 3.14) * 3) : 0;
    R(g, 31, 11 - up, 2, 25 + up, '#d9c28a'); R(g, 31, 11 - up, 1, 25 + up, '#fff0b0');
    R(g, 26, 22, 5, 3, cloth[1]); R(g, 28, 22 - up, 3, 3, SKIN);
    const gl = rk === 2 ? ['#d9a21c', '#ffd24a', '#fff4b0', '#ffffff'] : ['#2f8a4a', '#4fbf6a', '#aaf8c0', '#ffffff'];
    const rr = 3.4 + (s >= 0 ? Math.sin(s * 3.14) * 1.4 : 0);
    blob(g, 32, 8 - up, rr, rr, gl);
    R(g, 29, 11 - up, 6, 1, '#ffd84a');
    if (s >= 0.3) for (let a = 0; a < 5; a++) R(g, 32 + Math.cos(a * 1.3 + s * 3) * 7, 8 - up + Math.sin(a * 1.3 + s * 3) * 6, 1, 1, rk === 2 ? '#fff4b0' : '#aaf8c0');
    g.restore();
}

function miner(g, rk, p) {
    const P = PAL[rk], m = P.metal;
    const leather = rk === 2 ? ['#8a5a10', '#d9a21c', '#ffd24a'] : ['#4a3220', '#7a5230', '#a87a46'];
    wings(g, p, P, rk);
    g.save(); g.translate(0, -p.bob);
    cape(g, p, { ...P, cape: rk === 2 ? '#6a2fc0' : '#5a3a20', capeD: rk === 2 ? '#40187a' : '#3a2412' });
    R(g, 10, 18, 5, 9, '#6e4a22'); R(g, 10, 18, 5, 2, '#8a5a2b');             // ore backpack
    R(g, 11, 15, 3, 3, rk === 2 ? '#ffe680' : '#b8860b'); R(g, 12, 16, 1, 1, '#fff'); // nuggets
    g.restore();
    legs(g, p, { ...P, pants: rk === 2 ? '#40187a' : '#4a3a2a' });
    g.save(); g.translate(0, -p.bob);
    R(g, 14, 18, 12, 11, leather[1]); R(g, 14, 18, 3, 11, leather[2]); R(g, 23, 18, 3, 11, leather[0]);
    R(g, 14, 18, 12, 4, m[1]); R(g, 14, 18, 3, 4, m[2]);                      // iron chest plate
    R(g, 14, 27, 12, 2, '#3a2a18'); R(g, 19, 27, 2, 2, rk === 2 ? '#ffffff' : '#ffd84a');
    blob(g, 14, 19, 3.2, 2.6, m); blob(g, 26, 19, 3.2, 2.6, m);
    // helmet with lamp
    blob(g, 20, 10, 6.4, 5.6, m);
    R(g, 20, 9, 6, 5, SKIN); R(g, 20, 13, 6, 1, SKIN_D); R(g, 23, 10, 1, 2, EYE); R(g, 20, 12, 6, 2, '#6e4a22');   // face + stubble
    R(g, 24, 5, 4, 3, rk === 2 ? '#bff4ff' : '#ffe9a0'); R(g, 25, 6, 2, 1, '#ffffff');                               // lamp
    if (rk === 2) halo(g, p, P);
    // pickaxe
    const s = p.swing, ang = s < 0 ? -60 : (-135 + 165 * s), rad = ang * Math.PI / 180;
    const hx = 28, hy = 23 - (s >= 0 && s < 0.4 ? 3 : 0), len = rk === 2 ? 14 : 12;
    R(g, 25, 19, 4, 5, leather[1]); R(g, 28, hy - 1, 3, 3, SKIN);
    const tx = hx + Math.cos(rad) * len, ty = hy + Math.sin(rad) * len;
    line(g, hx, hy, tx, ty, '#8a5a2b', 2);
    const nx = -Math.sin(rad), ny = Math.cos(rad);
    line(g, tx + nx * 5, ty + ny * 5, tx - nx * 5, ty - ny * 5, rk === 2 ? '#fff4b0' : '#c8cedb', 2);              // head
    if (rk === 2) R(g, tx, ty, 2, 2, '#ffffff');
    if (s >= 0.6 && s <= 1) for (let i = 0; i < 4; i++) R(g, tx + 2 + i * 2, ty + 4 - (i % 2) * 3, 1, 1, '#ffe680');   // sparks
    g.restore();
}

const DRAWERS = { miner, swordsman, archer, mage, healer };

// ---------- sheet building ----------

function poseFor(anim, i) {
    const n = FRAMES[anim];
    if (anim === 'idle') return { bob: [0, 1, 1, 0][i], step: 0, swing: -1, sway: i / n };
    if (anim === 'walk') return { bob: [0, 1, 0, 1][i], step: [1, 0, -1, 0][i], swing: -1, sway: i / n };
    return { bob: [0, 0, 1, 0][i], step: 0, swing: i / (n - 1), sway: i / n };
}

const cache = {};

export function getRankFrames(key, rank) {
    const draw = DRAWERS[key];
    if (!draw || (rank !== 0 && rank !== 1 && rank !== 2)) return null;
    const id = key + rank;
    if (cache[id]) return cache[id];
    const total = ORDER.reduce((a, k) => a + FRAMES[k], 0);
    const { c, g } = make(CELL * total, CELL);
    const index = {};
    let col = 0;
    for (const anim of ORDER) {
        index[anim] = [];
        for (let i = 0; i < FRAMES[anim]; i++) {
            const f = make(CELL, CELL);
            draw(f.g, rank, poseFor(anim, i));
            outline(f.g, CELL, CELL, INK);
            g.drawImage(f.c, col * CELL, 0);
            index[anim].push(col++);
        }
    }
    cache[id] = { canvas: c, cell: CELL, index, rank, key };
    return cache[id];
}

// A still picture of the unit (used by the loadout / summon bar previews)
export function getRankPreview(key, rank) {
    const r = getRankFrames(key, rank);
    if (!r) return null;
    const { c, g } = make(CELL, CELL);
    g.drawImage(r.canvas, 0, 0, CELL, CELL, 0, 0, CELL, CELL);
    return c;
}

// ---------- animator (same interface as SpriteSkin) ----------

const SPEED = { idle: 210, walk: 105, attack: 95 };

export class RankAnimator {
    constructor(frames) {
        this.f = frames;
        this.anim = 'idle';
        this.t = Math.random() * 1000;
        this.height = frames.rank === 2 ? 40 : 38;
        this.spark = Math.random() * 6;
    }

    play(name) {
        if (!this.f.index[name]) name = 'idle';
        if (name !== this.anim) { this.anim = name; this.t = 0; }
    }

    update(ms) { this.t += ms; this.spark += ms / 1000; }

    draw(ctx, x, y, flip, scale = 1) {
        const list = this.f.index[this.anim];
        const i = Math.floor(this.t / SPEED[this.anim]) % list.length;
        const cell = this.f.cell, sz = cell * scale;
        const dx = Math.round(x - sz / 2), dy = Math.round(y - (FEET + 1) * scale);
        ctx.save();
        if (this.f.rank === 2) {                                   // soft aura under a Godly unit
            ctx.globalAlpha = 0.28 + 0.12 * Math.sin(this.spark * 3); ctx.fillStyle = '#ffe680';
            ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 15 * scale, 6 * scale, 0, 0, 6.3); ctx.fill();
            ctx.globalAlpha = 1;
        }
        if (flip) { ctx.translate(Math.round(x) * 2, 0); ctx.scale(-1, 1); }
        ctx.drawImage(this.f.canvas, list[i] * cell, 0, cell, cell, dx, dy, sz, sz);
        ctx.restore();
        this.sparkles(ctx, x, y, scale);
        return true;
    }

    // little floating lights: gold motes for Godly, blue glints for Elite
    sparkles(ctx, x, y, sc = 1) {
        if (this.f.rank < 1) return;
        const god = this.f.rank === 2, n = god ? 4 : 2;
        ctx.save();
        for (let k = 0; k < n; k++) {
            const ph = (this.spark * (god ? 0.9 : 0.6) + k / n) % 1;
            const px = x + Math.sin(this.spark * 1.7 + k * 2.1) * (god ? 13 : 10) * sc;
            const py = y - (6 + ph * (god ? 34 : 26)) * sc;
            ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
            ctx.fillStyle = god ? (k % 2 ? '#ffffff' : '#ffe680') : '#9fe4ff';
            ctx.fillRect(Math.round(px), Math.round(py), god && k === 0 ? 2 : 1, god && k === 0 ? 2 : 1);
        }
        ctx.restore();
    }
}