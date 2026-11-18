// UnitArt.js - pixel-art sprites for Swordsman, Archer, Mage and Healer, drawn in code.
// Same format as units.png: 32x32 cells, one right-facing and one left-facing frame per unit.
// A unit that has its own entry in units.json (hand-drawn in Aseprite) always wins over these.

const CELL = 32;

function make(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c, g };
}

const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

// Ellipse lit from the top-left. P = [dark, base, light, highlight]
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

// Long robe: rows from y0 to y1, widening downward. cols = [dark, base, light]
function robe(g, cx, y0, y1, w0, w1, cols) {
    for (let y = y0; y <= y1; y++) {
        const half = Math.round(w0 + (w1 - w0) * (y - y0) / (y1 - y0));
        for (let x = cx - half; x < cx + half; x++) {
            const t = (x - (cx - half)) / (2 * half);
            R(g, x, y, 1, 1, t < 0.25 ? cols[2] : (t > 0.72 ? cols[0] : cols[1]));
        }
    }
}

function outline(g, w, h, col) {
    const d = g.getImageData(0, 0, w, h).data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
    const add = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) add.push([x, y]);
        }
    }
    g.fillStyle = col;
    for (const [x, y] of add) g.fillRect(x, y, 1, 1);
}

const SKIN = '#f1c7a0', SKIN_D = '#d19a72', EYE = '#1a1424', BOOT = '#3a2f45', INK = '#1a1424';

function legs(g, pants) {
    R(g, 12, 24, 3, 4, pants);
    R(g, 17, 24, 3, 4, pants);
    R(g, 11, 28, 4, 3, BOOT);
    R(g, 17, 28, 5, 3, BOOT);
    R(g, 11, 28, 4, 1, '#5b4d6b');
    R(g, 17, 28, 5, 1, '#5b4d6b');
}

// ---------- the four units (all facing right) ----------

function swordsman(g) {
    // shield on the back arm
    blob(g, 9, 21, 4.5, 5.5, ['#5e3b1b', '#8a5a2b', '#b57a3c', '#d49a54']);
    R(g, 8, 20, 2, 3, '#c8cedb');
    legs(g, '#2f4f9e');
    // tunic
    R(g, 11, 15, 10, 10, '#4a7fe0');
    R(g, 11, 15, 2, 10, '#6b9bf0');
    R(g, 19, 15, 2, 10, '#355fb5');
    R(g, 11, 22, 10, 2, '#6e4a22');
    R(g, 15, 22, 2, 2, '#ffd84a');
    R(g, 15, 17, 2, 3, '#ffd84a');
    // sword arm
    R(g, 20, 17, 3, 4, '#4a7fe0');
    R(g, 22, 18, 3, 3, SKIN);
    R(g, 23, 5, 2, 14, '#e8eef8');
    R(g, 24, 5, 1, 14, '#9aa6bd');
    R(g, 23, 4, 2, 1, '#e8eef8');
    R(g, 21, 19, 6, 1, '#ffd84a');
    R(g, 23, 20, 2, 3, '#5e3b1b');
    R(g, 23, 23, 2, 1, '#ffd84a');
    // helmet
    blob(g, 16, 10, 6.2, 6, ['#5a647a', '#8e9ab2', '#bcc6da', '#e4ebf7']);
    R(g, 15, 9, 6, 1, '#5a647a');
    R(g, 16, 10, 5, 4, SKIN);
    R(g, 16, 13, 5, 1, SKIN_D);
    R(g, 18, 11, 1, 2, EYE);
    R(g, 8, 5, 5, 2, '#d23b3b');          // plume
    R(g, 12, 3, 5, 2, '#ff6a5a');
    R(g, 10, 6, 3, 2, '#a02828');
}

function archer(g) {
    // quiver on the back
    R(g, 8, 14, 3, 8, '#6e4a22');
    R(g, 8, 12, 1, 3, '#d23b3b');
    R(g, 10, 11, 1, 4, '#e8e0c8');
    R(g, 9, 13, 1, 2, '#e8e0c8');
    legs(g, '#5b4a2e');
    // tunic
    R(g, 11, 15, 10, 10, '#3fbf6a');
    R(g, 11, 15, 2, 10, '#62d98a');
    R(g, 19, 15, 2, 10, '#2a8a4c');
    R(g, 11, 22, 10, 2, '#6e4a22');
    R(g, 15, 22, 2, 2, '#d9b84a');
    R(g, 11, 15, 10, 2, '#d9b84a');       // scarf
    // bow
    for (let y = 6; y <= 25; y++) {
        const x = 24 + Math.round(2 * Math.sin(((y - 6) / 19) * Math.PI));
        R(g, x, y, 1, 1, y % 4 === 0 ? '#b57a3c' : '#8a5a2b');
    }
    R(g, 23, 7, 1, 18, '#e8e0c8');
    // arrow + drawing arm
    R(g, 14, 16, 14, 1, '#c8b88a');
    R(g, 28, 15, 2, 3, '#aab4c8');
    R(g, 14, 15, 2, 3, '#d23b3b');
    R(g, 19, 16, 4, 2, '#3fbf6a');
    R(g, 21, 15, 2, 3, SKIN);
    // hood
    blob(g, 16, 10, 6.5, 6, ['#1f6a3a', '#2a8a4c', '#3fbf6a', '#62d98a']);
    R(g, 8, 8, 5, 3, '#2a8a4c');
    R(g, 6, 10, 3, 2, '#1f6a3a');
    R(g, 16, 9, 5, 5, SKIN);
    R(g, 16, 13, 5, 1, SKIN_D);
    R(g, 18, 10, 1, 2, EYE);
}

function mage(g) {
    // robe, sleeve, hand
    robe(g, 16, 14, 29, 5, 8, ['#6e30b0', '#a050e0', '#c080ff']);
    R(g, 8, 28, 16, 2, '#ffd84a');
    for (let x = 9; x < 24; x += 3) R(g, x, 28, 1, 2, '#b8860b');
    R(g, 11, 21, 11, 2, '#3b2a7a');
    R(g, 15, 21, 2, 2, '#ffd84a');
    R(g, 20, 17, 5, 4, '#a050e0');
    R(g, 24, 18, 2, 3, SKIN);
    // staff and glowing orb
    R(g, 25, 8, 1, 22, '#8a5a2b');
    R(g, 26, 8, 1, 22, '#5e3b1b');
    blob(g, 25.5, 6, 3.2, 3.2, ['#7a3fd0', '#b27cff', '#e6d0ff', '#ffffff']);
    R(g, 29, 3, 1, 1, '#c9a0ff');
    R(g, 26, 1, 1, 1, '#c9a0ff');
    // face and beard
    R(g, 13, 9, 7, 6, SKIN);
    R(g, 18, 11, 1, 2, EYE);
    R(g, 20, 12, 1, 2, SKIN_D);
    R(g, 13, 14, 7, 5, '#f2f2f2');
    R(g, 13, 17, 7, 2, '#c9d2da');
    R(g, 15, 18, 3, 2, '#c9d2da');
    // pointy hat
    R(g, 8, 8, 15, 2, '#7a3fd0');
    R(g, 8, 8, 15, 1, '#9a5fe6');
    for (let y = 2; y <= 7; y++) {
        const half = Math.round((y - 1) * 0.95) + 1;
        const cx = 15;
        R(g, cx - half, y, half * 2, 1, '#7a3fd0');
        R(g, cx - half, y, Math.max(1, Math.round(half * 0.5)), 1, '#9a5fe6');
    }
    R(g, 12, 7, 8, 1, '#ffd84a');
    R(g, 14, 4, 2, 2, '#ffe080');
}

function healer(g) {
    robe(g, 16, 14, 29, 5, 8, ['#c9d2da', '#f2f2f2', '#ffffff']);
    R(g, 8, 28, 16, 2, '#7fe08a');
    for (let x = 9; x < 24; x += 3) R(g, x, 28, 1, 2, '#4fbf6a');
    R(g, 11, 21, 11, 2, '#4fbf6a');
    R(g, 15, 21, 2, 2, '#ffd84a');
    // chest cross
    R(g, 15, 15, 2, 5, '#4fbf6a');
    R(g, 13, 17, 6, 2, '#4fbf6a');
    // arm
    R(g, 20, 17, 4, 4, '#f2f2f2');
    R(g, 23, 18, 2, 3, SKIN);
    // staff
    R(g, 24, 9, 1, 21, '#d9c28a');
    R(g, 25, 9, 1, 21, '#a88d4e');
    blob(g, 24.5, 6, 3.2, 3.2, ['#2f8a4a', '#4fbf6a', '#8ff0a8', '#ffffff']);
    R(g, 22, 9, 5, 1, '#ffd84a');
    // hood and face
    blob(g, 16, 10, 6.5, 6, ['#b8c2cc', '#e8eef2', '#ffffff', '#ffffff']);
    R(g, 9, 9, 4, 3, '#e8eef2');
    R(g, 15, 9, 6, 5, SKIN);
    R(g, 15, 13, 6, 1, SKIN_D);
    R(g, 18, 10, 1, 2, EYE);
    R(g, 19, 12, 1, 1, '#ff9aa8');
    // halo
    R(g, 12, 1, 8, 1, '#ffe680');
    R(g, 11, 2, 1, 1, '#ffe680');
    R(g, 20, 2, 1, 1, '#ffe680');
    R(g, 13, 3, 6, 1, '#d9b84a');
}

const DRAWERS = { swordsman, archer, mage, healer };

let cache = null;

export function getUnitSheet() {
    if (cache) return cache;
    const names = Object.keys(DRAWERS);
    const { c, g } = make(CELL * names.length * 2, CELL);
    const units = {};
    names.forEach((name, i) => {
        const frame = make(CELL, CELL);
        DRAWERS[name](frame.g);
        outline(frame.g, CELL, CELL, INK);
        const rightX = i * 2 * CELL;
        g.drawImage(frame.c, rightX, 0);
        g.save();                                  // left-facing frame = mirror image
        g.translate(rightX + CELL * 2, 0);
        g.scale(-1, 1);
        g.drawImage(frame.c, 0, 0);
        g.restore();
        units[name] = { right: [i * 2, 0], left: [i * 2 + 1, 0] };
    });
    cache = { canvas: c, cell: CELL, units };
    return cache;
}

// ---------- the wave boss (64x64 cell) ----------

function warlord(g) {
    const SK = ['#2f4a22', '#4f7a35', '#73a74a', '#9ad66a'];
    const ST = ['#464955', '#686c78', '#8b8f9c', '#bec3cf'];
    const WD = '#6e4a22', WD_L = '#a2703a';
    // back arm and fist
    R(g, 8, 28, 8, 17, SK[1]);
    R(g, 8, 28, 2, 17, SK[2]);
    blob(g, 11, 47, 5.5, 5, SK);
    // back pauldron
    blob(g, 15, 26, 7.5, 6, ST);
    R(g, 11, 18, 2, 3, ST[3]); R(g, 15, 16, 2, 4, ST[3]); R(g, 19, 19, 2, 3, ST[3]);
    // legs and boots
    R(g, 20, 46, 10, 13, SK[1]); R(g, 34, 46, 10, 13, SK[1]);
    R(g, 20, 46, 2, 13, SK[2]); R(g, 34, 46, 2, 13, SK[2]);
    R(g, 18, 58, 13, 4, '#2a1f2a'); R(g, 33, 58, 14, 4, '#2a1f2a');
    R(g, 18, 58, 13, 1, '#5b4d6b'); R(g, 33, 58, 14, 1, '#5b4d6b');
    // torso and belly
    blob(g, 32, 36, 17.5, 15.5, SK);
    blob(g, 34, 42, 9, 7, [SK[1], SK[2], SK[3], SK[3]]);
    // chest plate with rivets, leather straps
    R(g, 25, 26, 14, 9, '#7d8392');
    R(g, 25, 26, 14, 2, '#bec3cf');
    R(g, 25, 33, 14, 2, '#464955');
    R(g, 27, 29, 1, 1, '#ffd84a'); R(g, 36, 29, 1, 1, '#ffd84a');
    R(g, 22, 24, 3, 14, '#4a3320'); R(g, 40, 24, 3, 14, '#4a3320');
    // belt and loincloth
    R(g, 19, 46, 26, 3, '#4a3320');
    R(g, 29, 46, 6, 3, '#ffd84a');
    R(g, 22, 49, 20, 8, '#6e4a22');
    R(g, 22, 49, 20, 1, '#a2703a');
    for (let x = 24; x < 42; x += 4) R(g, x, 52, 1, 5, '#4a3320');
    // head, jaw, tusks
    blob(g, 32, 16, 10, 9, SK);
    blob(g, 34, 22, 9, 5, SK);
    R(g, 33, 21, 9, 2, '#2a0f12');
    R(g, 34, 21, 2, 5, '#f2ecd8');
    R(g, 40, 21, 2, 5, '#f2ecd8');
    R(g, 34, 25, 2, 1, '#b8a888');
    R(g, 40, 25, 2, 1, '#b8a888');
    R(g, 34, 11, 8, 2, SK[0]);                 // brow
    R(g, 36, 14, 4, 2, '#ff3030');             // glowing eyes
    R(g, 37, 14, 1, 1, '#ffd0d0');
    R(g, 40, 17, 2, 3, SK[0]);                 // nose
    // horned iron helmet
    R(g, 23, 6, 19, 6, ST[1]);
    R(g, 23, 6, 19, 2, ST[3]);
    R(g, 23, 11, 19, 1, ST[0]);
    R(g, 31, 3, 3, 3, ST[2]);
    const horn = (x, dir) => {
        R(g, x, 7, 3, 3, '#e8dcc0');
        R(g, x + dir * 2, 4, 3, 4, '#e8dcc0');
        R(g, x + dir * 4, 1, 3, 4, '#f2ecd8');
        R(g, x + (dir > 0 ? 2 : 0), 7, 1, 3, '#b8a888');
    };
    horn(20, -1);
    horn(41, 1);
    // front arm, fist, club
    R(g, 48, 28, 9, 11, SK[1]);
    R(g, 48, 28, 2, 11, SK[2]);
    R(g, 54, 14, 4, 30, WD);
    R(g, 54, 14, 1, 30, WD_L);
    blob(g, 56, 39, 5.5, 5, SK);
    blob(g, 56, 13, 7, 10, ['#4a3320', WD, WD_L, '#c28a4a']);
    R(g, 49, 19, 14, 2, '#7d8392');
    for (const [x, y] of [[50, 8], [60, 7], [62, 13], [49, 14], [58, 4], [54, 3]]) R(g, x, y, 2, 2, '#bec3cf');
    // front pauldron
    blob(g, 50, 26, 8, 6.5, ST);
    R(g, 46, 17, 2, 4, ST[3]); R(g, 50, 15, 2, 5, ST[3]); R(g, 54, 18, 2, 3, ST[3]);
}

let bossCache = null;

export function getBossSheet() {
    if (bossCache) return bossCache;
    const SZ = 64;
    const { c, g } = make(SZ * 2, SZ);
    const frame = make(SZ, SZ);
    warlord(frame.g);
    outline(frame.g, SZ, SZ, INK);
    g.drawImage(frame.c, 0, 0);
    g.save();
    g.translate(SZ * 2, 0);
    g.scale(-1, 1);
    g.drawImage(frame.c, 0, 0);
    g.restore();
    bossCache = { canvas: c, cell: SZ, units: { boss: { right: [0, 0], left: [1, 0] } } };
    return bossCache;
}