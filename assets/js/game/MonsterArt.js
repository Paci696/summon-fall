// MonsterArt.js - redesigned, animated monsters and bosses (idle 4 / walk 4 / attack 4 frames each):
// slime, goblin, goblin_archer, zombie, ghoul, giant, boss (orc warlord), boss_bone (bone colossus).
// Frames are baked once. MonsterAnimator has the same interface as SpriteSkin (play / update / draw / height).
const INK = '#120e1c';
const FR = { idle: 4, walk: 4, attack: 4 }, ORDER = ['idle', 'walk', 'attack'];
const SPEC = {   // cell size, feet row
    slime: [40, 37], goblin: [40, 37], goblin_archer: [40, 37], zombie: [40, 37], ghoul: [40, 37],
    giant: [64, 61], boss: [72, 69], boss_bone: [72, 69],
};

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
const GOB = ['#1f5a22', '#3f9a3a', '#6ccf55', '#a8f080'], LEA = ['#3a2412', '#6e4a22', '#a87a46', '#c89a60'], BONE = ['#8a8470', '#cfc8b0', '#efe8d4', '#ffffff'];
const ZOM = ['#2a3a2a', '#5a7a5a', '#86a886', '#b0d0b0'], GHL = ['#4a4a5a', '#8a8aa0', '#b8b8d0', '#e0e0f0'], OGR = ['#6a3a22', '#a8683a', '#d08a56', '#f0b07a'];
const ORC = ['#244a1c', '#3f7a2a', '#68b040', '#a0e070'], IRON = ['#2c2c3c', '#5a5a74', '#8a8aa8', '#c8c8e0'];

// two legs; len = leg length, x0/x1 = hip x of back/front leg
function legs(g, p, y0, len, x0, x1, w, skin, boot) {
    const a = Math.round(p.step * 2), l1 = p.step > 0.5 ? 1 : 0, l2 = p.step < -0.5 ? 1 : 0;
    R(g, x0 - a, y0, w, len - l2, skin); R(g, x0 - a - 1, y0 + len - 2 - l2, w + 2, 3, boot);
    R(g, x1 + a, y0, w, len - l1, skin); R(g, x1 + a - 1, y0 + len - 2 - l1, w + 2, 3, boot);
}

// ---------- SLIME ----------
function slime(g, p) {
    const hop = [0, 4, 6, 2][p.walkI ?? 0] * (p.moving ? 1 : 0), s = p.swing;
    let rx = 13, ry = 10 + (p.bob ? 1 : 0), sq = 0, sh = 0;
    if (p.moving) { const q = [0, 1, 2, 3][p.walkI]; rx = [14, 12, 11, 14][q]; ry = [9, 11, 12, 8][q]; }
    if (s >= 0) { rx = [14, 11, 16, 13][Math.round(s * 3)]; ry = [8, 13, 8, 10][Math.round(s * 3)]; sh = [-2, -1, 5, 1][Math.round(s * 3)]; }
    const cx = 19 + sh, cy = 37 - ry - hop;
    g.globalAlpha = 0.3; R(g, 8, 36, 24, 2, '#000'); g.globalAlpha = 1;
    blob(g, cx, cy, rx, ry, ['#1a7a3c', '#35c45a', '#78ee8e', '#d4ffdc']);
    g.globalAlpha = 0.5; blob(g, cx - 2, cy + 2, rx * 0.55, ry * 0.5, ['#14602e', '#1e9a46', '#2cc05a', '#2cc05a']); g.globalAlpha = 1;   // inner core
    R(g, cx - 6, cy + 3, 2, 2, '#c8ffd4'); R(g, cx + 4, cy + 5, 1, 1, '#c8ffd4'); R(g, cx + 1, cy + 1, 1, 1, '#c8ffd4');                  // bubbles
    R(g, cx - 7, cy - 6, 4, 2, '#fff'); R(g, cx - 8, cy - 5, 1, 1, '#fff');                                                               // shine
    const ey = cy - 2 + (s >= 0.4 ? 1 : 0);
    R(g, cx + 1, ey - 2, 4, 5, '#fff'); R(g, cx + 6, ey - 2, 4, 5, '#fff'); R(g, cx + 3, ey - 1, 2, 3, '#14101e'); R(g, cx + 8, ey - 1, 2, 3, '#14101e');
    if (s >= 0.4 && s <= 0.8) { R(g, cx + 2, cy + 3, 7, 3, '#14101e'); R(g, cx + 3, cy + 3, 5, 1, '#fff'); } else R(g, cx + 3, cy + 4, 5, 1, '#14602e');
    if (p.moving) { R(g, cx - rx - 1, 36, 2, 2, '#78ee8e'); }
}

// ---------- GOBLIN ----------
function goblin(g, p) {
    const s = p.swing; g.save(); g.translate(0, -p.bob);
    legs(g, p, 29, 8, 13, 21, 4, GOB[1], LEA[1]);
    R(g, 12, 18, 14, 12, LEA[1]); R(g, 12, 18, 3, 12, LEA[2]); R(g, 23, 18, 3, 12, LEA[0]); R(g, 12, 27, 14, 2, '#2a1c10'); R(g, 18, 27, 3, 2, '#d9a21c'); R(g, 14, 20, 10, 2, LEA[3]);
    blob(g, 21, 11, 7.2, 6.4, GOB); R(g, 13, 9, 4, 3, GOB[2]); R(g, 10, 7, 4, 4, GOB[1]); R(g, 11, 8, 2, 2, '#ff9aa8');                     // ears
    R(g, 24, 9, 3, 3, '#fff2a0'); R(g, 25, 10, 1, 2, '#14101e'); R(g, 22, 8, 5, 1, GOB[0]);                                                  // eye
    R(g, 23, 14, 6, 2, '#14101e'); R(g, 24, 14, 1, 2, '#fff'); R(g, 27, 14, 1, 2, '#fff');                                                    // fangs
    const a = s < 0 ? -50 : -120 + 150 * s, rad = a * Math.PI / 180, hx = 27, hy = 23, ln = 11;
    R(g, 24, 20, 4, 4, GOB[1]); R(g, hx, hy - 1, 3, 3, GOB[2]);
    line(g, hx, hy, hx + Math.cos(rad) * ln, hy + Math.sin(rad) * ln, '#d8dce8', 2); line(g, hx - 2 * Math.sin(rad), hy + 2 * Math.cos(rad), hx + 2 * Math.sin(rad), hy - 2 * Math.cos(rad), LEA[2], 1);
    if (s >= 0.4 && s <= 0.9) for (let k = 0; k < 4; k++) R(g, hx + 8 + k * 2, hy + 4 - k, 2, 1, 'rgba(255,255,255,.8)');
    g.restore();
}

function goblinArcher(g, p) {
    const s = p.swing, pull = s < 0 ? 0 : Math.min(1, s / 0.55); g.save(); g.translate(0, -p.bob);
    legs(g, p, 29, 8, 13, 21, 4, GOB[1], LEA[0]);
    R(g, 12, 18, 14, 12, '#7a2a2a'); R(g, 12, 18, 3, 12, '#a84a4a'); R(g, 23, 18, 3, 12, '#4a1818'); R(g, 12, 27, 14, 2, '#2a1c10');
    R(g, 8, 17, 4, 11, LEA[1]); R(g, 9, 14, 1, 4, '#e8e0c8'); R(g, 11, 15, 1, 3, '#e8e0c8');                                                  // quiver
    blob(g, 21, 11, 7.6, 7, ['#4a1818', '#8a2a2a', '#c04a4a', '#e07070']);                                                                   // red hood
    R(g, 22, 9, 6, 6, GOB[1]); R(g, 25, 10, 2, 2, '#fff2a0'); R(g, 26, 10, 1, 2, '#14101e'); R(g, 24, 14, 4, 1, GOB[0]); R(g, 9, 11, 4, 3, GOB[2]);
    const bx = 31; for (let y = 10; y <= 30; y++) R(g, bx + Math.round(3 * Math.sin(((y - 10) / 20) * Math.PI)), y, 1, 1, y % 3 ? LEA[1] : LEA[3]);
    const sx = bx - Math.round(pull * 5); line(g, bx, 10, sx, 20, '#e8e0c8'); line(g, sx, 20, bx, 30, '#e8e0c8'); R(g, 26, 19, 4, 3, GOB[1]); R(g, sx - 1, 19, 3, 3, GOB[2]);
    if (s < 0.7) line(g, sx, 20, sx + 13, 20, '#c8b88a'); else { const fx = Math.min(39, 30 + (s - 0.7) * 40); line(g, fx - 7, 20, fx, 20, '#c8b88a'); R(g, fx + 1, 19, 2, 3, '#aab4c8'); }
    g.restore();
}

// ---------- ZOMBIE ----------
function zombie(g, p) {
    const s = p.swing, sh = Math.round(Math.sin(p.sway * 6.28)); g.save(); g.translate(0, -p.bob);
    legs(g, p, 29, 8, 13, 21, 4, '#4a5a4a', '#2a2a22');
    R(g, 12 + sh, 17, 14, 13, '#6a5a4a'); R(g, 12 + sh, 17, 3, 13, '#8a7a66'); R(g, 23 + sh, 17, 3, 13, '#3a2e24');
    for (let i = 0; i < 3; i++) R(g, 15 + sh, 20 + i * 3, 8, 1, '#e8e0cc');                                                                  // ribs showing through the rags
    R(g, 14 + sh, 29, 4, 3, '#6a5a4a'); R(g, 22 + sh, 29, 3, 4, '#6a5a4a');                                                                   // ragged hem
    blob(g, 20 + sh, 10, 6.8, 6.4, ZOM); R(g, 22 + sh, 8, 4, 4, '#fff6c0'); R(g, 24 + sh, 9, 2, 2, '#c02020'); R(g, 16 + sh, 6, 5, 3, '#2a1c10'); R(g, 21 + sh, 14, 6, 2, '#14101e'); R(g, 22 + sh, 14, 1, 2, '#e8e0cc'); R(g, 25 + sh, 14, 1, 2, '#e8e0cc');   // sunken socket, hair, mouth
    const reach = s >= 0 ? Math.round(Math.sin(s * 3.14) * 4) : Math.round(Math.sin(p.sway * 6.28) * 1);
    R(g, 25 + sh, 19, 9 + reach, 4, ZOM[1]); R(g, 33 + sh + reach, 18, 4, 5, ZOM[2]); for (let k = 0; k < 3; k++) R(g, 36 + sh + reach, 18 + k * 2, 2, 1, '#e8e0cc');
    R(g, 25 + sh, 25, 7 + reach, 3, ZOM[0]);
    if (s >= 0.4) for (let k = 0; k < 3; k++) R(g, 8 + k * 2, 26 + k, 1, 3, 'rgba(120,255,140,.8)');                                           // spore drip
    g.restore();
}

// ---------- GHOUL ----------
function ghoul(g, p) {
    const s = p.swing, lunge = s >= 0 ? Math.round(Math.sin(s * 3.14) * 4) : 0; g.save(); g.translate(0, -p.bob);
    legs(g, p, 28, 9, 12, 20, 4, GHL[0], '#2a2a3a');
    R(g, 11, 18, 13, 11, GHL[1]); R(g, 11, 18, 3, 11, GHL[2]); R(g, 21, 18, 3, 11, GHL[0]);                                                  // hunched torso
    for (let i = 0; i < 4; i++) R(g, 12 + i * 3, 17, 2, 3, GHL[3]);                                                                         // spine ridge
    blob(g, 25 + lunge, 12, 6.8, 6, GHL); R(g, 28 + lunge, 10, 4, 3, '#ffe85a'); R(g, 29 + lunge, 11, 2, 1, '#14101e'); R(g, 24 + lunge, 8, 3, 3, '#14101e');
    R(g, 26 + lunge, 15, 8, 3, '#14101e'); for (let k = 0; k < 4; k++) R(g, 27 + lunge + k * 2, 15, 1, 3 + (k % 2), '#fff');                    // jaw of teeth
    const ext = 3 + lunge;
    R(g, 24, 19, 6 + ext, 4, GHL[1]); R(g, 29 + ext, 19, 3, 4, GHL[2]);
    for (let k = 0; k < 3; k++) line(g, 31 + ext, 19 + k * 2, 37 + ext, 21 + k * 2 + (s >= 0.3 ? 2 : 0), '#f0f0ff', 1);                       // long claws
    if (s >= 0.4 && s <= 0.9) for (let k = 0; k < 3; k++) line(g, 33 + ext, 16 + k * 3, 38, 24 + k * 3, 'rgba(255,200,200,.9)');
    g.restore();
}

// ---------- GIANT (cell 64) ----------
function giant(g, p) {
    const s = p.swing; g.save(); g.translate(0, -p.bob);
    const a = Math.round(p.step * 3), l1 = p.step > 0.5 ? 2 : 0, l2 = p.step < -0.5 ? 2 : 0;
    R(g, 20 - a, 40, 9, 17 - l2, OGR[1]); R(g, 18 - a, 56 - l2, 13, 6, LEA[0]); R(g, 34 + a, 40, 9, 17 - l1, OGR[1]); R(g, 33 + a, 56 - l1, 14, 6, LEA[0]);
    R(g, 16, 22, 30, 22, OGR[1]); R(g, 16, 22, 7, 22, OGR[2]); R(g, 38, 22, 8, 22, OGR[0]);                                                  // belly + chest
    R(g, 16, 38, 30, 6, LEA[1]); R(g, 28, 38, 6, 6, '#d9a21c');                                                                                 // loincloth belt
    for (let i = 0; i < 4; i++) R(g, 20 + i * 6, 26 + (i % 2) * 3, 4, 1, OGR[0]);                                                              // scars
    blob(g, 18, 25, 8, 7, OGR); blob(g, 44, 25, 8, 7, OGR);
    blob(g, 32, 12, 11, 10, OGR); R(g, 34, 8, 10, 3, '#14101e'); R(g, 38, 9, 4, 4, '#ffe85a'); R(g, 39, 10, 2, 2, '#c02020'); R(g, 24, 7, 8, 3, OGR[0]);
    R(g, 31, 17, 14, 5, '#14101e'); R(g, 32, 15, 3, 5, '#fff6dc'); R(g, 41, 15, 3, 5, '#fff6dc'); R(g, 20, 4, 5, 6, '#d8d0b8'); R(g, 38, 2, 5, 5, '#d8d0b8');   // tusks + horns
    const ang = s < 0 ? -70 + Math.sin(p.sway * 6.28) * 4 : -150 + 190 * s, rad = ang * Math.PI / 180, hx = 48, hy = 30 - (s >= 0 && s < 0.4 ? 6 : 0), ln = 30;
    R(g, 44, 24, 8, 8, OGR[1]); R(g, 49, hy - 2, 7, 7, OGR[2]);
    const tx = hx + 3 + Math.cos(rad) * ln, ty = hy + Math.sin(rad) * ln;
    line(g, hx + 3, hy, tx, ty, LEA[1], 4); line(g, hx + 4, hy, tx + 1, ty, LEA[3], 1);
    blob(g, tx, ty, 8, 8, LEA); for (let k = 0; k < 4; k++) R(g, tx - 7 + k * 4, ty - 8 + (k % 2) * 14, 2, 2, '#c8c8d8');
    if (s >= 0.4 && s <= 0.9) { for (let k = 0; k < 6; k++) R(g, 54 + k * 2, 52 - k, 3, 2, 'rgba(255,230,160,.85)'); R(g, 50, 58, 12, 2, 'rgba(200,170,120,.8)'); }
    g.restore();
}

// ---------- BOSS: ORC WARLORD (cell 72) ----------
function boss(g, p) {
    const s = p.swing; g.save(); g.translate(0, -p.bob);
    const sw = Math.round(Math.sin(p.sway * 6.28) * 2 - p.step * 2);
    for (let y = 26; y < 62; y++) { const w = 6 + Math.floor((y - 26) / 3); R(g, 20 - w + Math.round(sw * (y - 26) / 36), y, w + 1, 1, y > 50 ? '#5a1010' : '#a02424'); }     // war cape
    const a = Math.round(p.step * 3), l1 = p.step > 0.5 ? 2 : 0, l2 = p.step < -0.5 ? 2 : 0;
    R(g, 24 - a, 46, 10, 18 - l2, '#3a3a50'); R(g, 22 - a, 62 - l2, 14, 7, IRON[1]); R(g, 40 + a, 46, 10, 18 - l1, '#3a3a50'); R(g, 39 + a, 62 - l1, 16, 7, IRON[1]);
    R(g, 20, 24, 34, 24, ORC[1]); R(g, 20, 24, 8, 24, ORC[2]); R(g, 46, 24, 8, 24, ORC[0]);
    R(g, 20, 24, 34, 14, IRON[1]); R(g, 20, 24, 8, 14, IRON[2]); R(g, 46, 24, 8, 14, IRON[0]); R(g, 34, 26, 6, 10, '#d23b3b'); R(g, 20, 40, 34, 5, LEA[1]); R(g, 33, 40, 8, 5, '#ffd24a');
    blob(g, 20, 26, 10, 8, IRON); blob(g, 54, 26, 10, 8, IRON); for (const x of [14, 19, 24, 50, 55, 60]) R(g, x, 16 + (x % 2) * 3, 3, 8, '#d8d8e8');   // spiked pauldrons
    blob(g, 38, 13, 12, 11, ORC); blob(g, 38, 9, 13, 8, IRON);                                                                                   // helm
    R(g, 40, 13, 12, 5, '#14101e'); R(g, 43, 14, 5, 3, '#ff4030'); R(g, 44, 14, 2, 1, '#fff');                                                    // glowing eye slit
    R(g, 36, 19, 14, 5, '#14101e'); R(g, 37, 17, 3, 6, '#fff6dc'); R(g, 47, 17, 3, 6, '#fff6dc');                                                  // tusks
    R(g, 20, 3, 4, 12, '#e8e0c8'); R(g, 14, 0, 4, 7, '#e8e0c8'); R(g, 52, 3, 4, 12, '#e8e0c8'); R(g, 58, 0, 4, 7, '#e8e0c8');                         // horns
    const ang = s < 0 ? -70 + Math.sin(p.sway * 6.28) * 3 : -160 + 200 * s, rad = ang * Math.PI / 180, hx = 58, hy = 34 - (s >= 0 && s < 0.4 ? 7 : 0), ln = 34;
    R(g, 52, 28, 9, 9, ORC[1]); R(g, 58, hy - 3, 8, 8, ORC[2]);
    const tx = hx + 4 + Math.cos(rad) * ln, ty = hy + Math.sin(rad) * ln;
    line(g, hx + 4, hy, tx, ty, '#6a4a2a', 4);
    const nx = -Math.sin(rad), ny = Math.cos(rad);                                                                                               // cleaver head
    for (let i = 0; i < 14; i++) { const t = i / 13, px = tx + nx * (4 + t * 6) - Math.cos(rad) * t * 4, py = ty + ny * (4 + t * 6) - Math.sin(rad) * t * 4; R(g, px, py, 5, 5, i % 3 ? '#d8d8e8' : '#fff'); }
    if (s >= 0.4 && s <= 0.9) for (let k = 0; k < 8; k++) { const r2 = (ang - 90 + k * 12) * Math.PI / 180; R(g, hx + 4 + Math.cos(r2) * 36, hy + Math.sin(r2) * 36, 4, 4, 'rgba(255,120,80,.9)'); }
    g.restore();
}

// ---------- BOSS: BONE COLOSSUS (cell 72) ----------
function bone(g, p) {
    const s = p.swing; g.save(); g.translate(0, -p.bob);
    const a = Math.round(p.step * 3), l1 = p.step > 0.5 ? 2 : 0, l2 = p.step < -0.5 ? 2 : 0;
    for (const [x, l] of [[24 - a, l2], [40 + a, l1]]) { R(g, x, 46, 7, 18 - l, BONE[1]); R(g, x, 46, 2, 18 - l, BONE[2]); R(g, x - 2, 62 - l, 12, 7, BONE[1]); R(g, x - 2, 62 - l, 12, 2, BONE[3]); R(g, x - 1, 44, 9, 4, BONE[2]); }
    R(g, 22, 22, 30, 26, '#1a1a2a');                                                                                                              // hollow chest
    for (let i = 0; i < 5; i++) { R(g, 22, 24 + i * 5, 30, 3, BONE[1]); R(g, 22, 24 + i * 5, 30, 1, BONE[3]); R(g, 20, 24 + i * 5, 3, 3, BONE[2]); R(g, 51, 24 + i * 5, 3, 3, BONE[2]); }
    R(g, 35, 20, 4, 30, BONE[2]); R(g, 36, 20, 1, 30, BONE[3]);                                                                                  // spine
    const pul = 0.6 + 0.4 * Math.sin(p.sway * 6.28); g.globalAlpha = 0.5 + 0.4 * pul; blob(g, 37, 35, 5, 5, ['#1a8a60', '#3af0a0', '#a0ffd8', '#ffffff']); g.globalAlpha = 1;   // soul core
    blob(g, 21, 24, 9, 7, BONE); blob(g, 53, 24, 9, 7, BONE); for (const x of [14, 19, 51, 56]) R(g, x, 15, 3, 8, BONE[3]);
    blob(g, 37, 11, 11, 10, BONE); R(g, 28, 5, 18, 4, BONE[2]); R(g, 40, 9, 8, 6, '#14101e'); R(g, 42, 10, 4, 4, '#3af0a0'); R(g, 43, 11, 2, 2, '#fff'); R(g, 29, 9, 7, 6, '#14101e'); R(g, 31, 10, 3, 4, '#3af0a0');
    R(g, 32, 17, 12, 5, '#14101e'); for (let k = 0; k < 5; k++) R(g, 33 + k * 2, 17, 1, 4, BONE[3]);
    for (const x of [22, 28, 34, 40, 46]) R(g, x, 0 + (x % 4), 3, 7, BONE[2]);                                                                  // crown
    for (let k = 0; k < 3; k++) { const fl = Math.round(Math.sin(p.sway * 6.28 + k) * 1.5); R(g, 24 + k * 10, -1 + fl, 2, 3, '#3af0a0'); }
    const ang = s < 0 ? -70 : -160 + 200 * s, rad = ang * Math.PI / 180, hx = 58, hy = 34 - (s >= 0 && s < 0.4 ? 7 : 0), ln = 32;
    R(g, 52, 28, 8, 8, BONE[1]); R(g, 58, hy - 3, 8, 8, BONE[2]);
    const tx = hx + 4 + Math.cos(rad) * ln, ty = hy + Math.sin(rad) * ln;
    line(g, hx + 4, hy, tx, ty, BONE[1], 5); line(g, hx + 5, hy, tx + 1, ty, BONE[3], 1); blob(g, tx, ty, 8, 8, BONE); R(g, tx - 2, ty - 2, 4, 4, '#3af0a0');
    if (s >= 0.4 && s <= 0.9) for (let k = 0; k < 8; k++) { const r2 = (ang - 80 + k * 11) * Math.PI / 180; R(g, hx + 4 + Math.cos(r2) * 34, hy + Math.sin(r2) * 34, 3, 3, 'rgba(120,255,200,.9)'); }
    g.restore();
}

const DRAW = { slime, goblin, goblin_archer: goblinArcher, zombie, ghoul, giant, boss, boss_bone: bone };
const poseFor = (a, i) => a === 'idle' ? { bob: [0, 1, 1, 0][i], step: 0, swing: -1, sway: i / 4, moving: false }
    : a === 'walk' ? { bob: [0, 1, 0, 1][i], step: [1, 0, -1, 0][i], swing: -1, sway: i / 4, moving: true, walkI: i }
    : { bob: [0, 0, 1, 0][i], step: 0, swing: i / 3, sway: i / 4, moving: false };

const cache = {};
export function getMonsterFrames(key) {
    const d = DRAW[key]; if (!d) return null;
    if (cache[key]) return cache[key];
    const [cell, feet] = SPEC[key];
    const { c, g } = make(cell * 12, cell); const index = {}; let col = 0;
    for (const a of ORDER) { index[a] = []; for (let i = 0; i < FR[a]; i++) { const f = make(cell, cell); d(f.g, poseFor(a, i)); outline(f.g, cell, cell, INK); g.drawImage(f.c, col * cell, 0); index[a].push(col++); } }
    return (cache[key] = { canvas: c, cell, feet, index, key, boss: key === 'boss' || key === 'boss_bone', big: key === 'giant' });
}

const SPEED = { idle: 230, walk: 120, attack: 100 };
export class MonsterAnimator {
    constructor(frames, canvasOverride) {
        this.f = frames; this.sheet = canvasOverride || frames.canvas;
        this.anim = 'idle'; this.t = Math.random() * 900; this.s = Math.random() * 6;
        this.height = frames.feet - (frames.boss ? 6 : 8);
    }
    play(n) { if (!this.f.index[n]) n = 'idle'; if (n !== this.anim) { this.anim = n; this.t = 0; } }
    update(ms) { this.t += ms; this.s += ms / 1000; }
    draw(ctx, x, y, flip) {
        const f = this.f, list = f.index[this.anim], i = Math.floor(this.t / SPEED[this.anim]) % list.length, cell = f.cell;
        if (f.boss) this.aura(ctx, x, y);
        ctx.save();
        if (flip) { ctx.translate(Math.round(x) * 2, 0); ctx.scale(-1, 1); }
        ctx.drawImage(this.sheet, list[i] * cell, 0, cell, cell, Math.round(x - cell / 2), Math.round(y - f.feet - 1), cell, cell);
        ctx.restore();
        if (f.boss) this.embers(ctx, x, y);
        return true;
    }
    // bosses: pulsing ground rune ring and rising embers so they read as a boss from far away
    aura(ctx, x, y) {
        const bone = this.f.key === 'boss_bone', col = bone ? '58,240,160' : '255,70,40', p = 0.5 + 0.5 * Math.sin(this.s * 3);
        ctx.save();
        ctx.globalAlpha = 0.18 + 0.12 * p; ctx.fillStyle = 'rgb(' + col + ')';
        ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 30, 11, 0, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 0.5 + 0.3 * p; ctx.strokeStyle = 'rgb(' + col + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 34 + p * 3, 12 + p, 0, 0, 6.3); ctx.stroke();
        for (let k = 0; k < 6; k++) { const an = this.s * 0.8 + k * 1.047; ctx.fillStyle = 'rgb(' + col + ')'; ctx.fillRect(Math.round(x + Math.cos(an) * 34), Math.round(y + Math.sin(an) * 12), 2, 2); }
        ctx.restore();
    }
    embers(ctx, x, y) {
        const bone = this.f.key === 'boss_bone';
        ctx.save();
        for (let k = 0; k < 5; k++) {
            const ph = (this.s * 0.6 + k / 5) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
            ctx.fillStyle = bone ? (k % 2 ? '#d8fff0' : '#3af0a0') : (k % 2 ? '#ffd080' : '#ff6a30');
            ctx.fillRect(Math.round(x + Math.sin(this.s * 1.3 + k * 2) * 20), Math.round(y - 10 - ph * 60), 2, 2);
        }
        ctx.restore();
    }
}