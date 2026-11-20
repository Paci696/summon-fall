// BossArt.js - the two bosses, redrawn big (128x112 frames): the Orc Warlord and the Bone Colossus.
// Weapons are drawn as their own sprite and rotated into the swing, so they are never clipped and always readable.
// Same frame layout as MonsterArt: idle 4 / walk 4 / attack 4, baked once.
export const BOSS_W = 168, BOSS_H = 148, BOSS_FEET = 144;      // frame size, feet row (body centre is x = 84)
const INK = '#120e1c';
const FR = { idle: 4, walk: 4, attack: 4 }, ORDER = ['idle', 'walk', 'attack'];

function make(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false; return { c, g }; }
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
    for (;;) { R(g, x0 - (w >> 1), y0 - (w >> 1), w, w, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function outline(g, w, h, col) {
    const d = g.getImageData(0, 0, w, h).data, s = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!s(x, y) && (s(x - 1, y) || s(x + 1, y) || s(x, y - 1) || s(x, y + 1))) add.push([x, y]);
    g.fillStyle = col; for (const [x, y] of add) g.fillRect(x, y, 1, 1);
}
const ORC = ['#1f4a1a', '#3f7a2a', '#68b040', '#a0e070'], IRON = ['#25253a', '#555574', '#8a8aa8', '#d0d0ea'], LEA = ['#2a1a0e', '#5a3a1c', '#8a5a2c', '#b08040'];
const BONE = ['#7a745e', '#c8c0a4', '#ece4cc', '#ffffff'], RED = ['#4a0c10', '#8a1820', '#c83030', '#ff6a50'], SOUL = ['#127a56', '#2ee89a', '#9affd4', '#ffffff'];

// keyframes for the attack swing: hand position + weapon angle (0 = pointing straight up, clockwise positive)
const SWING = [{ x: 100, y: 40, a: -0.9 }, { x: 94, y: 30, a: -0.35 }, { x: 108, y: 64, a: 2.0 }, { x: 104, y: 72, a: 1.55 }];
function hand(p, idle) {
    if (p.swing < 0) return { x: idle.x + Math.round(Math.sin(p.sway * 6.28) * 1), y: idle.y + (p.bob ? 1 : 0), a: idle.a + Math.sin(p.sway * 6.28) * 0.05 };
    return SWING[Math.min(3, Math.round(p.swing * 3))];
}
function drawWeapon(g, wc, h, gripX, gripY) {
    g.save(); g.translate(h.x, h.y); g.rotate(h.a); g.drawImage(wc, -gripX, -gripY); g.restore();
}

// ---------------- weapons (drawn pointing up, grip near the bottom) ----------------
let WARCLEAVER, BONECLUB;
function cleaver() {
    const { c, g } = make(64, 96);
    R(g, 29, 14, 5, 78, LEA[1]); R(g, 29, 14, 2, 78, LEA[2]); R(g, 33, 14, 1, 78, LEA[0]);                       // haft
    for (let y = 56; y < 90; y += 6) { R(g, 28, y, 7, 2, '#2a1a0e'); }                                           // grip wraps
    blob(g, 31, 92, 5, 5, IRON); R(g, 30, 90, 2, 3, '#e8e0c8');                                                  // pommel
    R(g, 27, 4, 8, 12, IRON[1]); R(g, 29, 0, 4, 6, IRON[3]);                                                      // top spike
    for (let y = 6; y < 50; y++) {                                                                                 // great curved blade on the right
        const t = (y - 6) / 43, w = Math.round(6 + 26 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.75));
        for (let x = 0; x < w; x++) { const f = x / w; R(g, 34 + x, y, 1, 1, f > 0.86 ? IRON[3] : f > 0.62 ? IRON[2] : f > 0.2 ? IRON[1] : IRON[0]); }
        if (y % 11 === 8) R(g, 34 + w - 4, y, 4, 3, 'rgba(0,0,0,0)');                                             // chipped edge
    }
    R(g, 44, 22, 3, 3, RED[3]); R(g, 40, 30, 2, 2, RED[2]); R(g, 47, 32, 2, 2, RED[3]); R(g, 41, 14, 2, 2, RED[2]);   // war runes
    for (let y = 14; y < 44; y += 7) R(g, 34, y, 5, 2, '#d8c8a0');                                                // rivets
    blob(g, 24, 30, 5, 9, IRON); R(g, 20, 22, 4, 2, IRON[3]);                                                      // back spike (beard)
    return c;
}
function club() {
    const { c, g } = make(64, 96);
    R(g, 29, 22, 6, 70, BONE[1]); R(g, 29, 22, 2, 70, BONE[2]); R(g, 34, 22, 1, 70, BONE[0]);                    // femur shaft
    blob(g, 29, 90, 5, 5, BONE); blob(g, 36, 91, 5, 5, BONE);                                                      // knuckle end
    for (let y = 60; y < 88; y += 7) { R(g, 28, y, 8, 2, SOUL[0]); R(g, 30, y, 4, 1, SOUL[1]); }                  // glowing bindings
    blob(g, 32, 17, 17, 15, BONE);                                                                                  // giant skull head
    R(g, 21, 12, 8, 7, '#0b0a14'); R(g, 35, 12, 8, 7, '#0b0a14'); R(g, 23, 13, 4, 5, SOUL[1]); R(g, 37, 13, 4, 5, SOUL[1]); R(g, 24, 14, 2, 2, '#fff'); R(g, 38, 14, 2, 2, '#fff');
    R(g, 28, 20, 8, 4, '#0b0a14'); R(g, 22, 25, 20, 6, '#0b0a14'); for (let x = 23; x < 42; x += 3) R(g, x, 25, 2, 5, BONE[3]);
    for (const [x, y, h] of [[16, 8, 9], [47, 8, 9], [24, 0, 8], [40, 0, 8], [32, -1, 7]]) { if (y >= 0) R(g, x, y, 3, h, BONE[2]); }
    return c;
}

// ---------------- ORC WARLORD ----------------
function warlord(g, p) {
    if (!WARCLEAVER) WARCLEAVER = cleaver();
    const b = p.bob, sw = Math.sin(p.sway * 6.28);
    g.save(); g.translate(20, 36 - b);
    // war cape (behind everything)
    for (let y = 36; y < 100; y++) { const w = 20 + Math.floor((y - 36) / 2.6), off = Math.round(sw * 2 + (p.step || 0) * 3 * (y - 36) / 64); R(g, 64 - w + off - 8, y, w * 2 - 4, 1, y > 88 ? RED[0] : y % 9 < 2 ? RED[0] : RED[1]); }
    // legs
    const st = Math.round((p.step || 0) * 5), l1 = p.step > 0.5 ? 3 : 0, l2 = p.step < -0.5 ? 3 : 0;
    for (const [x, l] of [[46 - st, l2], [70 + st, l1]]) {
        R(g, x, 78, 14, 24 - l, '#2e2e44'); R(g, x, 78, 4, 24 - l, '#44445e'); R(g, x + 10, 78, 4, 24 - l, IRON[0]);
        R(g, x - 2, 90 - l, 18, 5, IRON[2]); R(g, x - 2, 90 - l, 18, 2, IRON[3]);                                     // knee guard
        R(g, x - 3, 100 - l, 20, 9, LEA[1]); R(g, x - 3, 100 - l, 20, 3, LEA[2]); R(g, x - 3, 107 - l, 20, 2, LEA[0]);  // boots
    }
    // loincloth + belt
    R(g, 46, 72, 36, 22, RED[1]); R(g, 46, 72, 36, 3, RED[2]); R(g, 56, 74, 16, 18, RED[2]); R(g, 60, 78, 8, 4, '#e8e0c8');
    // left (back) arm
    const ar = Math.round(sw * 1);
    line(g, 38, 50, 30, 68 + ar, ORC[0], 11); line(g, 38, 50, 31, 68 + ar, ORC[1], 8);
    R(g, 24, 64 + ar, 13, 8, IRON[1]); R(g, 24, 64 + ar, 13, 2, IRON[3]); blob(g, 30, 76 + ar, 6, 6, ORC);              // bracer + fist
    // torso
    blob(g, 64, 58, 26, 24, ORC);
    R(g, 40, 70, 48, 8, LEA[1]); R(g, 40, 70, 48, 2, LEA[2]); R(g, 58, 69, 12, 10, '#ffd24a'); R(g, 61, 71, 6, 6, '#7a1010');   // belt + buckle
    for (let i = 0; i < 18; i++) { R(g, 44 + i, 42 + i, 3, 2, LEA[0]); R(g, 84 - i, 42 + i, 3, 2, LEA[0]); }          // crossed straps
    R(g, 50, 40, 28, 22, IRON[1]); R(g, 50, 40, 8, 22, IRON[2]); R(g, 72, 40, 6, 22, IRON[0]);                      // breastplate
    R(g, 62, 42, 4, 18, RED[2]); R(g, 56, 48, 16, 3, RED[2]);
    for (const [x, y] of [[53, 44], [74, 44], [53, 56], [74, 56]]) R(g, x, y, 2, 2, IRON[3]);
    // pauldrons with spikes
    for (const sx of [34, 94]) {
        blob(g, sx, 44, 15, 12, IRON); R(g, sx - 12, 52, 24, 3, IRON[0]);
        for (const dx of [-8, 0, 8]) { R(g, sx + dx - 1, 28 + (dx === 0 ? -3 : 1), 3, 10, '#e8e8f4'); R(g, sx + dx, 28 + (dx === 0 ? -3 : 1), 1, 4, '#fff'); }
    }
    // head
    blob(g, 64, 28, 15, 13, ORC);
    R(g, 50, 17, 28, 11, IRON[1]); R(g, 50, 17, 28, 4, IRON[3]); blob(g, 64, 16, 15, 8, IRON);                       // open helm
    R(g, 50, 26, 10, 3, '#1a1426'); R(g, 68, 26, 10, 3, '#1a1426'); R(g, 53, 28, 5, 3, '#ff3a28'); R(g, 70, 28, 5, 3, '#ff3a28'); R(g, 54, 28, 2, 1, '#fff'); R(g, 71, 28, 2, 1, '#fff');  // glowing eyes
    R(g, 54, 36, 20, 6, '#14101e'); R(g, 56, 33, 4, 8, '#fff6dc'); R(g, 68, 33, 4, 8, '#fff6dc');                    // jaw + tusks
    R(g, 57, 31, 2, 3, '#fff6dc'); R(g, 69, 31, 2, 3, '#fff6dc');
    R(g, 62, 30, 4, 4, ORC[0]);                                                                                       // snout
    for (const s of [-1, 1]) { const x = 64 + s * 17; R(g, x - 3, 14, 6, 10, '#e8e0c8'); R(g, x + s * 4 - 3, 6, 6, 10, '#f4ecd4'); R(g, x + s * 8 - 2, 0, 5, 9, '#fff6dc'); } // curved horns
    // right arm + weapon
    const h = hand(p, { x: 100, y: 68, a: 0.4 });
    line(g, 92, 50, h.x, h.y, ORC[0], 12); line(g, 92, 50, h.x, h.y, ORC[1], 9);
    drawWeapon(g, WARCLEAVER, h, 31, 66);
    blob(g, h.x, h.y, 6, 6, ORC); R(g, h.x - 5, h.y - 4, 10, 3, IRON[2]);
    if (p.swing >= 0.5 && p.swing <= 0.7) { g.globalAlpha = 0.7; for (let k = 0; k < 10; k++) R(g, 82 + k * 4, 18 + k * 5 + (k % 2) * 3, 5, 3, 'rgba(255,120,80,.9)'); g.globalAlpha = 1; }   // slash arc
    g.restore();
}

// ---------------- BONE COLOSSUS ----------------
function colossus(g, p) {
    if (!BONECLUB) BONECLUB = club();
    const b = p.bob, sw = Math.sin(p.sway * 6.28), pul = 0.6 + 0.4 * Math.sin(p.sway * 6.28);
    g.save(); g.translate(20, 36 - b);
    // tattered shroud
    for (let y = 70; y < 98; y++) { const w = 22 + (y - 70) / 4, off = Math.round(sw * 2); R(g, 64 - w + off, y, w * 2, 1, y > 92 ? '#0c2a26' : y % 7 < 2 ? '#0e3a34' : '#14504a'); }
    for (let k = 0; k < 7; k++) R(g, 40 + k * 8, 96 + (k % 2) * 3, 5, 5, '#0e3a34');
    // legs (femur + shin + big foot bones)
    const st = Math.round((p.step || 0) * 5), l1 = p.step > 0.5 ? 3 : 0, l2 = p.step < -0.5 ? 3 : 0;
    for (const [x, l] of [[48 - st, l2], [71 + st, l1]]) {
        R(g, x, 76, 9, 18 - l, BONE[1]); R(g, x, 76, 3, 18 - l, BONE[2]); blob(g, x + 4, 94 - l, 7, 6, BONE);                // thigh + knee
        R(g, x + 1, 98 - l, 7, 8, BONE[1]); R(g, x + 1, 98 - l, 2, 8, BONE[2]);                                           // shin
        R(g, x - 5, 104 - l, 20, 5, BONE[1]); R(g, x - 5, 104 - l, 20, 2, BONE[3]); for (let k = 0; k < 4; k++) R(g, x - 5 + k * 5, 108 - l, 3, 1, BONE[0]);   // foot
    }
    R(g, 44, 70, 40, 8, BONE[1]); R(g, 44, 70, 40, 2, BONE[3]); blob(g, 64, 76, 12, 6, BONE);                              // pelvis
    // back arm (left)
    const ar = Math.round(sw);
    line(g, 38, 46, 28, 66 + ar, BONE[1], 8); line(g, 38, 46, 28, 66 + ar, BONE[2], 3); blob(g, 28, 68 + ar, 6, 6, BONE);
    for (let k = 0; k < 4; k++) R(g, 22 + k * 3, 72 + ar, 2, 7, BONE[2]);                                                // finger bones
    // ribcage: hollow, glowing soul
    R(g, 44, 38, 40, 34, '#0b0a14');
    for (let i = 0; i < 6; i++) {
        const y = 40 + i * 5, w = 20 - Math.abs(i - 2) * 2;
        R(g, 64 - w, y, w * 2, 3, BONE[1]); R(g, 64 - w, y, w * 2, 1, BONE[3]); R(g, 64 - w - 2, y + 1, 4, 3, BONE[2]); R(g, 64 + w - 2, y + 1, 4, 3, BONE[2]);
    }
    R(g, 61, 36, 6, 38, BONE[2]); R(g, 62, 36, 2, 38, BONE[3]);                                                              // spine
    for (let y = 40; y < 70; y += 4) R(g, 59, y, 10, 2, BONE[1]);                                                            // vertebrae
    g.globalAlpha = 0.45 + 0.4 * pul; blob(g, 64, 54, 11, 11, SOUL); g.globalAlpha = 1; blob(g, 64, 54, 6, 6, SOUL);         // soul core
    for (let k = 0; k < 6; k++) { const an = p.sway * 6.28 + k, rr = 9 + Math.sin(an * 2) * 2; R(g, 64 + Math.cos(an) * rr, 54 + Math.sin(an) * rr, 2, 2, SOUL[2]); }
    // shoulder armour of bone
    for (const sx of [34, 94]) { blob(g, sx, 42, 14, 11, BONE); for (const dx of [-8, 0, 8]) { R(g, sx + dx - 1, 26 + (dx === 0 ? -3 : 1), 3, 10, BONE[3]); } R(g, sx - 10, 50, 20, 3, BONE[0]); }
    // skull
    blob(g, 64, 22, 16, 14, BONE); R(g, 50, 12, 28, 4, BONE[2]);
    R(g, 50, 20, 11, 9, '#0b0a14'); R(g, 67, 20, 11, 9, '#0b0a14'); R(g, 53, 21, 6, 6, SOUL[1]); R(g, 70, 21, 6, 6, SOUL[1]); R(g, 55, 22, 2, 2, '#fff'); R(g, 72, 22, 2, 2, '#fff');
    R(g, 62, 28, 4, 5, '#0b0a14');
    R(g, 52, 33, 24, 8, '#0b0a14'); for (let x = 53; x < 76; x += 3) { R(g, x, 33, 2, 4, BONE[3]); R(g, x, 38, 2, 3, BONE[2]); }
    for (const [x, h] of [[48, 10], [54, 14], [60, 17], [66, 17], [72, 14], [78, 10]]) R(g, x, 2 + (14 - h) / 2, 4, h, BONE[2]);   // crown spikes
    for (let k = 0; k < 4; k++) { const fl = Math.round(Math.sin(p.sway * 6.28 + k * 1.7) * 2); R(g, 52 + k * 7, -2 + fl, 3, 5, SOUL[1]); R(g, 53 + k * 7, -4 + fl, 1, 3, SOUL[3]); }   // soulfire
    // right arm + club
    const h = hand(p, { x: 100, y: 68, a: 0.35 });
    line(g, 92, 46, h.x, h.y, BONE[1], 9); line(g, 92, 46, h.x, h.y, BONE[2], 3); blob(g, 96 + (h.x - 96) * 0.4, 56 + (h.y - 56) * 0.4, 5, 5, BONE);   // forearm + elbow
    drawWeapon(g, BONECLUB, h, 32, 80);
    blob(g, h.x, h.y, 6, 6, BONE);
    if (p.swing >= 0.5 && p.swing <= 0.7) { g.globalAlpha = 0.7; for (let k = 0; k < 10; k++) R(g, 82 + k * 4, 18 + k * 5 + (k % 2) * 3, 5, 3, 'rgba(120,255,200,.9)'); g.globalAlpha = 1; }
    g.restore();
}

const poseFor = (a, i) => a === 'idle' ? { bob: [0, 1, 1, 0][i], step: 0, swing: -1, sway: i / 4 }
    : a === 'walk' ? { bob: [0, 2, 0, 2][i], step: [1, 0, -1, 0][i], swing: -1, sway: i / 4 }
    : { bob: [0, 0, 2, 1][i], step: 0, swing: i / 3, sway: i / 4 };
const DRAW = { boss: warlord, boss_bone: colossus };
const cache = {};
export function getBossFrames(key) {
    const d = DRAW[key]; if (!d) return null;
    if (cache[key]) return cache[key];
    const { c, g } = make(BOSS_W * 12, BOSS_H); const index = {}; let col = 0;
    for (const a of ORDER) {
        index[a] = [];
        for (let i = 0; i < FR[a]; i++) { const f = make(BOSS_W, BOSS_H); d(f.g, poseFor(a, i)); outline(f.g, BOSS_W, BOSS_H, INK); g.drawImage(f.c, col * BOSS_W, 0); index[a].push(col); col++; }
    }
    return (cache[key] = { canvas: c, cell: BOSS_W, cw: BOSS_W, ch: BOSS_H, feet: BOSS_FEET, hgt: 108, index, key, boss: true, big: true });
}