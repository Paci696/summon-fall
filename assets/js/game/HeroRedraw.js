// HeroRedraw.js - brand new hand-coded art for the six heroes, 48x48 cells, 12 frames each:
// idle (4), walk (4), attack (4). Baked once into a sheet. Used by HeroAnim.js.
const CELL = 48, FEET = 45, INK = '#120e1c';
const FR = { idle: 4, walk: 4, attack: 4 }, ORDER = ['idle', 'walk', 'attack'];

function make(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return { c, g }; }
const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
function blob(g, cx, cy, rx, ry, P) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v > 1) continue;
        const l = -(0.6 * u + 0.8 * v); R(g, x, y, 1, 1, l > 0.62 ? ((x + y) % 2 ? P[2] : P[3]) : l > 0.22 ? P[2] : l < -0.5 ? P[0] : P[1]);
    }
}
function line(g, x0, y0, x1, y1, col, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { R(g, x0, y0, w, w, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function outline(g, w, h, col) {
    const d = g.getImageData(0, 0, w, h).data, s = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!s(x, y) && (s(x - 1, y) || s(x + 1, y) || s(x, y - 1) || s(x, y + 1))) add.push([x, y]);
    g.fillStyle = col; for (const [x, y] of add) g.fillRect(x, y, 1, 1);
}
const SKIN = '#f1c7a0', SKIN_D = '#d19a72', EYE = '#14101e';
const STEEL = ['#3d4864', '#7384ad', '#b4c3e8', '#eef4ff'], GOLD = ['#8a5a10', '#d9a21c', '#ffd24a', '#fff4b0'];
const GREEN = ['#12402a', '#1f7a48', '#3fbf6a', '#8af0a8'], PURP = ['#2a1670', '#5a36d0', '#8f70ff', '#d0c4ff'];
const FUR = ['#3a3a48', '#6a6a7c', '#9a9ab0', '#cfcfe0'], WOLF = ['#2a2630', '#4a4654', '#7a7488', '#aaa4bc'];
const DARK = ['#120c24', '#271a4a', '#43307a', '#6a52b0'];

function legs(g, p, pants, boot, tr) {
    const a = Math.round(p.step * 2), l1 = p.step > 0.5 ? 1 : 0, l2 = p.step < -0.5 ? 1 : 0;
    R(g, 17 - a, 33, 5, 9 - l2, pants); R(g, 16 - a, 41 - l2, 7, 4, boot); R(g, 16 - a, 41 - l2, 7, 1, tr);
    R(g, 25 + a, 33, 5, 9 - l1, pants); R(g, 25 + a, 41 - l1, 8, 4, boot); R(g, 25 + a, 41 - l1, 8, 1, tr);
}
function cloak(g, p, c1, c2, top = 18, len = 18) {
    const sw = Math.round(Math.sin(p.sway * 6.28) * 2 - p.step * 2);
    for (let y = top; y < top + len; y++) { const w = 4 + Math.floor((y - top) / 3); R(g, 16 - w + Math.round(sw * (y - top) / len), y, w + 1, 1, y > top + len * 0.6 ? c2 : c1); }
}
function pauld(g, P) { blob(g, 16, 21, 4, 3.2, P); blob(g, 30, 21, 4, 3.2, P); }

// ---------- KNIGHT: gold-trimmed paladin with tower shield and great sword ----------
function knight(g, p) {
    const s = p.swing;
    g.save(); g.translate(0, -p.bob);
    cloak(g, p, '#c0302c', '#7a1a1a', 19, 20);
    for (let y = 0; y < 15; y++) { const w = 8 - Math.max(0, y - 8); R(g, 9 - Math.floor(w / 2), 20 + y, w + 2, 1, y < 2 ? GOLD[3] : y % 5 ? '#2a50c8' : '#1a3490'); }   // kite shield
    R(g, 8, 24, 4, 7, GOLD[2]); R(g, 9, 26, 2, 3, '#fff');
    g.restore(); legs(g, p, '#3a4a78', '#2b3248', GOLD[1]); g.save(); g.translate(0, -p.bob);
    R(g, 15, 19, 16, 15, STEEL[1]); R(g, 15, 19, 4, 15, STEEL[2]); R(g, 27, 19, 4, 15, STEEL[0]);
    R(g, 15, 31, 16, 3, '#6e4a22'); R(g, 21, 31, 4, 3, GOLD[2]); R(g, 22, 22, 2, 7, GOLD[2]); R(g, 20, 24, 6, 2, GOLD[2]);
    pauld(g, GOLD);
    blob(g, 23, 11, 8, 8, STEEL); R(g, 24, 9, 9, 4, INK); R(g, 25, 10, 7, 1, '#9fe4ff'); R(g, 22, 5, 2, 12, GOLD[2]);   // great helm
    R(g, 17, 1, 8, 3, '#e0453c'); R(g, 13, 3, 6, 4, '#a02828'); R(g, 20, 0, 6, 2, '#ff7a6a');                     // plume
    const ang = s < 0 ? -78 + Math.sin(p.sway * 6.28) * 3 : -150 + 190 * s, rad = ang * Math.PI / 180, hx = 33, hy = 27 - (s >= 0 && s < 0.4 ? 4 : 0), len = 21;
    R(g, 29, 22, 5, 6, STEEL[1]); R(g, 33, hy - 1, 4, 4, SKIN);
    const tx = hx + Math.cos(rad) * len, ty = hy + Math.sin(rad) * len;
    line(g, hx, hy, tx, ty, '#eef4ff', 3); line(g, hx + 1, hy, tx + 1, ty, '#9fb0d8', 1);
    line(g, hx - 3 * Math.sin(rad), hy + 3 * Math.cos(rad), hx + 3 * Math.sin(rad), hy - 3 * Math.cos(rad), GOLD[2], 2);
    if (s >= 0.3 && s <= 0.9) for (let a = ang - 80; a < ang; a += 8) { const r2 = a * Math.PI / 180; R(g, hx + Math.cos(r2) * 19, hy + Math.sin(r2) * 19, 3, 3, 'rgba(255,240,170,.9)'); }
    g.restore();
}

// ---------- ARCHER: hooded ranger with a longbow ----------
function archer(g, p) {
    const s = p.swing, pull = s < 0 ? 0 : Math.min(1, s / 0.55);
    g.save(); g.translate(0, -p.bob);
    cloak(g, p, '#1f6a3a', '#12402a', 19, 19);
    R(g, 12, 18, 5, 14, '#6e4a22'); for (let i = 0; i < 3; i++) { R(g, 12 + i * 2, 13 - i, 1, 6 + i, '#e8e0c8'); R(g, 12 + i * 2, 12 - i, 1, 2, '#d23b3b'); }
    g.restore(); legs(g, p, '#4a3a2a', '#3a2a18', '#8a5a2b'); g.save(); g.translate(0, -p.bob);
    R(g, 15, 19, 16, 15, GREEN[1]); R(g, 15, 19, 4, 15, GREEN[2]); R(g, 27, 19, 4, 15, GREEN[0]);
    R(g, 15, 31, 16, 3, '#6e4a22'); R(g, 21, 31, 4, 3, GOLD[2]); R(g, 15, 19, 16, 3, '#e0c060');   // scarf
    pauld(g, ['#4a3220', '#7a5230', '#a87a46', '#c89a60']);
    blob(g, 23, 11, 8.4, 8, GREEN); R(g, 24, 9, 7, 7, SKIN); R(g, 24, 15, 7, 1, SKIN_D); R(g, 28, 11, 2, 2, EYE); R(g, 29, 11, 1, 1, '#7fe8a0');
    R(g, 13, 8, 2, 8, '#fff'); R(g, 11, 6, 3, 3, '#d23b3b');                                                  // feather
    const bx = 37, hi = '#b57a3c';
    for (let y = 9; y <= 40; y++) { const x = bx + Math.round(4 * Math.sin(((y - 9) / 31) * Math.PI)); R(g, x, y, 2, 1, y % 3 ? '#8a5a2b' : hi); }
    const sx = bx - Math.round(pull * 9);
    line(g, bx, 9, sx, 24, '#e8e0c8'); line(g, sx, 24, bx, 40, '#e8e0c8');
    R(g, 30, 23, 5, 4, GREEN[2]); R(g, sx - 1, 23, 4, 4, SKIN);
    if (s < 0.7) line(g, sx, 24, sx + 21, 24, '#d9c88a', 1);
    else { const fx = Math.min(47, 36 + (s - 0.7) * 50); line(g, fx - 10, 24, fx, 24, '#d9c88a'); R(g, fx + 1, 23, 3, 3, '#cfd8ea'); }
    g.restore();
}

// ---------- MAGE: archmage with starred robe, white beard and crystal staff ----------
function mage(g, p) {
    const s = p.swing, sw = Math.round(p.step * 1.5);
    g.save(); g.translate(0, -p.bob);
    for (let y = 18; y <= 45; y++) { const half = 7 + Math.round((y - 18) * 0.3), o = Math.round(sw * (y - 18) / 27);
        for (let x = 22 - half + o; x < 22 + half + o; x++) { const t = (x - (22 - half - o)) / (2 * half); R(g, x, y, 1, 1, t < 0.22 ? PURP[2] : t > 0.74 ? PURP[0] : PURP[1]); } }
    R(g, 14 + sw, 43, 20, 3, GOLD[2]); R(g, 15, 31, 16, 3, GOLD[1]); R(g, 21, 31, 4, 3, '#fff');
    for (let i = 0; i < 10; i++) R(g, 15 + (i * 7) % 15, 22 + (i * 5) % 20, 1, 1, '#fff4b0');
    pauld(g, GOLD);
    R(g, 19, 11, 9, 8, SKIN); R(g, 25, 13, 2, 2, '#7fe0ff'); R(g, 19, 17, 9, 7, '#f2f2f2'); R(g, 21, 23, 5, 3, '#c9d2da');    // face + beard
    R(g, 13, 10, 22, 3, PURP[1]); R(g, 13, 10, 22, 1, PURP[2]);                                                          // brim
    for (let y = 0; y <= 9; y++) { const half = Math.round((y + 1) * 1.1) + 1; R(g, 24 - half, y, half * 2, 1, PURP[1]); R(g, 24 - half, y, Math.max(1, half >> 1), 1, PURP[2]); }
    R(g, 18, 9, 11, 1, GOLD[2]); R(g, 22, 4, 3, 3, '#fff4b0');
    const lean = s >= 0 ? Math.round(s * 3) : 0;
    R(g, 36 + lean, 14, 2, 31, '#8a5a2b'); R(g, 36 + lean, 14, 1, 31, '#b57a3c'); R(g, 31, 26, 6, 4, PURP[1]); R(g, 34 + lean, 26, 4, 4, SKIN);
    const oy = 9 + Math.round(Math.sin(p.sway * 6.28)), rr = 4.4 + (s >= 0 ? s * 2 : 0);
    blob(g, 37 + lean, oy, rr, rr, ['#2a7ad0', '#6ac8ff', '#c0eeff', '#ffffff']);
    R(g, 34 + lean, 14, 7, 1, GOLD[2]);
    if (s >= 0.4) for (let a = 0; a < 7; a++) { const r2 = a * 0.9 + s * 2, d = 8 + s * 4; R(g, 37 + lean + Math.cos(r2) * d, oy + Math.sin(r2) * d, 2, 2, '#aee8ff'); }
    g.restore();
}

// ---------- LYCAN (human form): grey-maned hunter in a fur coat with claw gauntlets ----------
function lycan(g, p) {
    const s = p.swing;
    g.save(); g.translate(0, -p.bob);
    cloak(g, p, '#5a3a20', '#3a2412', 19, 20);
    g.restore(); legs(g, p, '#3a3a4a', '#2a2430', '#8a6a3a'); g.save(); g.translate(0, -p.bob);
    R(g, 15, 19, 16, 15, '#7a5230'); R(g, 15, 19, 4, 15, '#a87a46'); R(g, 27, 19, 4, 15, '#4a3220');
    R(g, 15, 31, 16, 3, '#2a1c10'); R(g, 21, 31, 4, 3, '#cfd8ea'); R(g, 22, 24, 2, 4, '#ffd24a');                 // moon pendant
    blob(g, 16, 20, 5, 4, FUR); blob(g, 30, 20, 5, 4, FUR); R(g, 15, 18, 16, 3, FUR[2]);                           // fur collar
    blob(g, 23, 11, 7.5, 7.5, FUR); R(g, 25, 9, 6, 6, SKIN); R(g, 25, 14, 6, 1, SKIN_D); R(g, 28, 10, 2, 2, '#ffb020'); R(g, 26, 9, 2, 1, '#8a3030');   // face, amber eye
    R(g, 14, 7, 4, 10, FUR[2]); R(g, 12, 12, 3, 8, FUR[1]);                                                        // mane
    const a1 = s < 0 ? 0 : (s < 0.5 ? -1 : 1) * 4, ext = s >= 0.3 ? 6 : 0;
    R(g, 29, 22, 6, 5, '#7a5230'); R(g, 33 + ext, 23 + a1, 5, 5, '#4a4654');
    for (let k = 0; k < 3; k++) line(g, 37 + ext, 23 + a1 + k * 2, 42 + ext, 22 + a1 + k * 2 + (s >= 0.3 ? 3 : 0), '#e8eef8');              // claws
    if (s >= 0.4 && s <= 0.95) for (let k = -1; k <= 1; k++) for (let i = 0; i < 9; i++) R(g, 38 + ext + i, 20 + k * 5 + i, 2, 1, 'rgba(255,200,140,.9)');
    g.restore();
}

// ---------- WOLF (shapeshifted Lycan): four-legged, bigger, red eyes ----------
function wolf(g, p) {
    const s = p.swing, run = p.step, bob = p.bob;
    g.save(); g.translate(2, -bob);
    const lunge = s >= 0 ? Math.round(Math.sin(s * 3.14) * 2) : 0;
    const body = (dx, y0, w, h, P) => blob(g, 22 + dx, y0, w, h, P);
    const l = (x, d, up) => { R(g, x + d, 33 - up, 4, 10 + up, WOLF[1]); R(g, x + d - 1, 43, 6, 3, WOLF[0]); R(g, x + d - 1, 43, 6, 1, '#cfd8e8'); };
    const a = Math.round(run * 3);
    l(12, -a, run > 0.5 ? 2 : 0); l(18, a, 0); l(29, a, 0); l(35, -a, run < -0.5 ? 2 : 0);
    // tail
    const tw = Math.round(Math.sin(p.sway * 6.28) * 2);
    line(g, 6, 24, 1, 19 + tw, WOLF[1], 4); line(g, 1, 19 + tw, 0, 16 + tw, WOLF[2], 3);
    body(0, 28, 15, 8, WOLF); body(-6, 27, 8, 7, WOLF);
    for (let i = 0; i < 6; i++) R(g, 13 + i * 3, 20 + (i % 2), 2, 3, WOLF[3]);                                // fur spikes
    blob(g, 38 + lunge, 22, 7.5, 6.5, WOLF); R(g, 43 + lunge, 24, 5, 4, WOLF[2]); R(g, 44 + lunge, 27, 3, 1, '#14101e');
    R(g, 34 + lunge, 13, 3, 6, WOLF[1]); R(g, 40 + lunge, 13, 3, 6, WOLF[1]); R(g, 35 + lunge, 15, 1, 3, '#ff9aa8');   // ears
    R(g, 40 + lunge, 20, 3, 2, '#ff3030'); R(g, 41 + lunge, 20, 1, 1, '#fff');                                // eye
    if (s >= 0.25 && s < 0.95) { R(g, 43 + lunge, 27, 1, 3, '#fff'); R(g, 46 + lunge, 27, 1, 3, '#fff'); R(g, 44 + lunge, 25, 3, 1, '#c02020'); }
    if (s >= 0.4) for (let k = 0; k < 3; k++) line(g, 44 + lunge, 18 + k * 4, 47, 24 + k * 4, 'rgba(255,170,150,.9)');
    g.restore();
}

// ---------- NECROMANCER: tattered black robe, skull staff with green flame, drifting souls ----------
function necro(g, p) {
    const s = p.swing, sw = Math.round(p.step * 1.5), t = p.sway * 6.28;
    g.save(); g.translate(0, -p.bob);
    for (let y = 18; y <= 45; y++) { const half = 7 + Math.round((y - 18) * 0.3), o = Math.round(sw * (y - 18) / 27);
        for (let x = 22 - half + o; x < 22 + half + o; x++) { if (y > 40 && (x + y) % 4 === 0) continue; const tt = (x - (22 - half - o)) / (2 * half); R(g, x, y, 1, 1, tt < 0.22 ? DARK[3] : tt > 0.74 ? DARK[0] : DARK[2]); } }
    R(g, 15, 31, 16, 2, '#7dffb0'); R(g, 21, 31, 4, 3, '#7dffb0'); R(g, 20, 21, 6, 1, '#7dffb0'); R(g, 22, 20, 2, 8, '#7dffb0');       // rune sash
    blob(g, 16, 21, 4.5, 3.5, DARK); blob(g, 30, 21, 4.5, 3.5, DARK);
    blob(g, 23, 11, 8.4, 8.2, DARK); R(g, 25, 9, 6, 7, '#1a1230'); R(g, 26, 10, 2, 2, '#7dffb0'); R(g, 29, 10, 2, 2, '#7dffb0'); R(g, 26, 14, 5, 1, '#e8e8d8');   // hood + glowing eyes + teeth
    R(g, 14, 5, 3, 6, DARK[3]);
    const lean = s >= 0 ? Math.round(s * 3) : 0;
    R(g, 36 + lean, 15, 2, 30, '#4a3a2a'); R(g, 31, 26, 6, 4, DARK[2]); R(g, 34 + lean, 26, 4, 4, '#cfd8c8');
    blob(g, 37 + lean, 11, 4.2, 4, ['#9a9a8a', '#d8d8c8', '#f4f4e8', '#ffffff']); R(g, 35 + lean, 11, 2, 2, '#14101e'); R(g, 38 + lean, 11, 2, 2, '#14101e'); R(g, 36 + lean, 14, 3, 1, '#14101e');   // skull
    const fl = Math.round(Math.sin(t * 2) * 1.5);                                                                   // flame
    R(g, 36 + lean, 4 + fl, 3, 4, '#7dffb0'); R(g, 37 + lean, 1 + fl, 1, 4, '#d8ffe8'); R(g, 34 + lean, 6, 2, 2, '#3ae090'); R(g, 40 + lean, 6, 2, 2, '#3ae090');
    for (let k = 0; k < 3; k++) { const a = t + k * 2.1, x = 8 + k * 3 + Math.round(Math.cos(a) * 3), y = 16 + k * 8 + Math.round(Math.sin(a) * 3); R(g, x, y, 2, 2, 'rgba(160,255,200,.85)'); R(g, x, y + 2, 1, 2, 'rgba(120,255,170,.5)'); }   // souls
    if (s >= 0.4) for (let a = 0; a < 8; a++) { const r2 = a * 0.8 + s * 2, d = 7 + s * 5; R(g, 37 + lean + Math.cos(r2) * d, 11 + Math.sin(r2) * d, 2, 2, '#7dffb0'); }
    g.restore();
}

const DRAW = { hero_knight: knight, hero_archer: archer, hero_mage: mage, hero_lycan: lycan, hero_lycan_wolf: wolf, hero_necromancer: necro };
const pose = (a, i) => a === 'idle' ? { bob: [0, 1, 1, 0][i], step: 0, swing: -1, sway: i / 4 }
    : a === 'walk' ? { bob: [0, 1, 0, 1][i], step: [1, 0, -1, 0][i], swing: -1, sway: i / 4 }
    : { bob: [0, 0, 1, 0][i], step: 0, swing: i / 3, sway: i / 4 };

const cache = {};
export function getRedrawnHero(key) {
    const d = DRAW[key]; if (!d) return null;
    if (cache[key]) return cache[key];
    const { c, g } = make(CELL * 12, CELL); const index = {}; let col = 0;
    for (const a of ORDER) { index[a] = []; for (let i = 0; i < FR[a]; i++) { const f = make(CELL, CELL); d(f.g, pose(a, i)); outline(f.g, CELL, CELL, INK); g.drawImage(f.c, col * CELL, 0); index[a].push(col++); } }
    return (cache[key] = { canvas: c, cell: CELL, index, key, top: 0, feet: FEET, h: 46 });
}
export const REDRAWN_KEYS = Object.keys(DRAW);