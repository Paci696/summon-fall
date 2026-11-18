// HeroArt.js - pixel-art sprites for the three heroes (Knight, Archer, Mage), drawn in code.
// 48x48 cells, one right-facing and one left-facing frame per hero. A hand-drawn entry in units.json
// with the same key (hero_knight, hero_archer, hero_mage) always wins over these.

const CELL = 48;

function make(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c, g };
}

const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

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

const SKIN = '#f1c7a0', SKIN_D = '#d19a72', EYE = '#1a1424', BOOT = '#3a2f45', INK = '#1a1424', GOLD = '#ffd84a';
const STEEL = ['#4a5468', '#7f8ba3', '#b4c0d6', '#e6edf9'];

function knight(g) {
    // red cape behind
    for (let y = 18; y <= 42; y++) {
        const w = 5 + Math.round((y - 18) * 0.28);
        R(g, 17 - w, y, w, 1, y % 5 === 0 ? '#7a1c1c' : '#a02828');
    }
    R(g, 10, 22, 2, 18, '#7a1c1c');
    // legs and boots
    R(g, 17, 34, 6, 9, STEEL[1]);
    R(g, 26, 34, 6, 9, STEEL[1]);
    R(g, 17, 34, 2, 9, STEEL[2]);
    R(g, 26, 34, 2, 9, STEEL[2]);
    R(g, 16, 42, 8, 4, BOOT);
    R(g, 26, 42, 9, 4, BOOT);
    R(g, 16, 42, 8, 1, '#5b4d6b');
    R(g, 26, 42, 9, 1, '#5b4d6b');
    // kite shield on the back arm
    blob(g, 13, 29, 6, 8.5, ['#2f4f9e', '#4a7fe0', '#6b9bf0', '#9cc0ff']);
    R(g, 12, 23, 2, 13, GOLD);
    R(g, 9, 28, 8, 2, GOLD);
    // breastplate
    blob(g, 24, 27, 9.5, 8.5, STEEL);
    R(g, 16, 33, 16, 3, '#6e4a22');
    R(g, 22, 33, 4, 3, GOLD);
    R(g, 22, 22, 4, 8, '#e6edf9');
    // pauldrons
    blob(g, 31, 21, 5.5, 4.5, STEEL);
    blob(g, 17, 21, 4.5, 4, STEEL);
    // sword arm and greatsword
    R(g, 30, 24, 6, 5, STEEL[1]);
    R(g, 36, 26, 5, 5, STEEL[3]);
    R(g, 38, 2, 3, 24, '#e8eef8');
    R(g, 40, 2, 1, 24, '#9aa6bd');
    R(g, 39, 0, 1, 2, '#e8eef8');
    R(g, 34, 25, 11, 2, GOLD);
    R(g, 38, 31, 3, 4, '#5e3b1b');
    R(g, 38, 35, 3, 2, GOLD);
    // great helm with plume
    blob(g, 24, 13, 7.5, 7.5, STEEL);
    R(g, 25, 12, 8, 2, INK);
    R(g, 29, 14, 1, 5, INK);
    R(g, 24, 18, 8, 1, STEEL[0]);
    R(g, 12, 6, 7, 3, '#d23b3b');
    R(g, 17, 3, 7, 3, '#ff6a5a');
    R(g, 14, 9, 5, 3, '#a02828');
    R(g, 22, 5, 4, 2, GOLD);
}

function archer(g) {
    // cloak behind
    for (let y = 18; y <= 42; y++) {
        const w = 4 + Math.round((y - 18) * 0.2);
        R(g, 18 - w, y, w, 1, y % 4 === 0 ? '#1f6a3a' : '#2a8a4c');
    }
    // quiver
    R(g, 11, 14, 4, 14, '#6e4a22');
    R(g, 11, 14, 1, 14, '#a2703a');
    R(g, 11, 11, 1, 4, '#d23b3b');
    R(g, 13, 10, 1, 5, '#e8e0c8');
    R(g, 14, 12, 1, 3, '#d23b3b');
    // legs and boots
    R(g, 18, 34, 5, 9, '#5b4a2e');
    R(g, 26, 34, 5, 9, '#5b4a2e');
    R(g, 17, 41, 7, 5, '#4a3320');
    R(g, 26, 41, 8, 5, '#4a3320');
    R(g, 17, 41, 7, 1, '#7a5a38');
    R(g, 26, 41, 8, 1, '#7a5a38');
    // tunic, belt, clasp
    R(g, 17, 20, 15, 15, '#3fbf6a');
    R(g, 17, 20, 3, 15, '#62d98a');
    R(g, 29, 20, 3, 15, '#2a8a4c');
    R(g, 17, 31, 15, 3, '#6e4a22');
    R(g, 23, 31, 3, 3, GOLD);
    R(g, 17, 20, 15, 3, '#d9b84a');
    R(g, 22, 22, 3, 3, GOLD);
    // longbow
    for (let y = 6; y <= 40; y++) {
        const x = 40 + Math.round(4 * Math.sin(((y - 6) / 34) * Math.PI));
        R(g, x, y, 2, 1, y % 5 === 0 ? '#b57a3c' : '#8a5a2b');
    }
    R(g, 40, 7, 1, 33, '#e8e0c8');
    // nocked arrow and drawing arm
    R(g, 23, 25, 21, 1, '#c8b88a');
    R(g, 44, 24, 3, 3, '#aab4c8');
    R(g, 23, 24, 3, 3, '#d23b3b');
    R(g, 28, 23, 9, 4, '#3fbf6a');
    R(g, 36, 24, 3, 3, SKIN);
    // hood and face
    blob(g, 24, 13, 8.5, 8, ['#1f6a3a', '#2a8a4c', '#3fbf6a', '#62d98a']);
    R(g, 13, 12, 6, 4, '#2a8a4c');
    R(g, 11, 15, 4, 3, '#1f6a3a');
    R(g, 25, 11, 8, 7, SKIN);
    R(g, 25, 17, 8, 1, SKIN_D);
    R(g, 30, 12, 1, 2, EYE);
    R(g, 24, 8, 9, 2, '#1f6a3a');
}

function mage(g) {
    // robe
    robe(g, 24, 22, 44, 9, 13, ['#2e2a7a', '#4a46c0', '#7a76f0']);
    R(g, 10, 43, 28, 2, GOLD);
    for (let x = 11; x < 37; x += 4) R(g, x, 43, 1, 2, '#b8860b');
    R(g, 16, 32, 17, 2, GOLD);
    R(g, 23, 32, 3, 3, '#ffe680');
    for (const [x, y] of [[18, 37], [28, 38], [22, 41], [31, 35], [15, 40]]) R(g, x, y, 1, 1, '#ffe680');
    // sleeve and hand
    R(g, 31, 25, 7, 5, '#4a46c0');
    R(g, 31, 25, 7, 1, '#7a76f0');
    R(g, 37, 26, 3, 4, SKIN);
    // staff with glowing orb and claw
    R(g, 39, 12, 2, 34, '#8a5a2b');
    R(g, 40, 12, 1, 34, '#5e3b1b');
    R(g, 37, 12, 6, 1, GOLD);
    R(g, 37, 9, 1, 4, GOLD);
    R(g, 42, 9, 1, 4, GOLD);
    blob(g, 40, 7, 4.6, 4.6, ['#1f8ad0', '#4ac8ff', '#c0f0ff', '#ffffff']);
    R(g, 45, 2, 1, 1, '#c0f0ff');
    R(g, 35, 3, 1, 1, '#c0f0ff');
    R(g, 44, 12, 1, 1, '#c0f0ff');
    // face, nose, long white beard
    R(g, 19, 15, 9, 7, SKIN);
    R(g, 25, 17, 1, 2, EYE);
    R(g, 28, 18, 2, 2, SKIN_D);
    R(g, 19, 21, 10, 8, '#f2f2f2');
    R(g, 19, 26, 10, 3, '#c9d2da');
    R(g, 21, 28, 6, 3, '#c9d2da');
    R(g, 20, 21, 3, 4, '#ffffff');
    // wide-brim hat with a pointed top
    R(g, 11, 13, 23, 2, '#2e2a7a');
    R(g, 11, 13, 23, 1, '#5a56d0');
    for (let y = 1; y <= 12; y++) {
        const half = Math.round(y * 0.8) + 1;
        const cx = 22 + (y < 4 ? 1 : 0);
        R(g, cx - half, y, half * 2, 1, '#2e2a7a');
        R(g, cx - half, y, Math.max(1, Math.round(half * 0.45)), 1, '#4a46c0');
    }
    R(g, 14, 11, 16, 2, GOLD);
    R(g, 21, 6, 2, 2, '#ffe680');
}


function lycan(g) {
    // hunter in a brown coat with a fur collar, silver hair, yellow eyes, crossbow
    R(g, 17, 20, 15, 15, '#6b4a2e');
    R(g, 17, 20, 3, 15, '#8a6440');
    R(g, 29, 20, 3, 15, '#4e3420');
    R(g, 16, 33, 17, 3, '#3a2a1a');
    R(g, 23, 33, 3, 3, '#cfd6e2');
    R(g, 15, 19, 19, 4, '#cfc7b8');
    R(g, 15, 19, 19, 1, '#ece6da');
    R(g, 18, 36, 6, 7, '#3a3340');
    R(g, 26, 36, 6, 7, '#3a3340');
    R(g, 17, 42, 8, 4, '#2a2030');
    R(g, 26, 42, 9, 4, '#2a2030');
    R(g, 17, 42, 8, 1, '#4a4058');
    R(g, 26, 42, 9, 1, '#4a4058');
    // crossbow
    R(g, 30, 24, 15, 3, '#6e4a22');
    R(g, 30, 24, 15, 1, '#a2703a');
    R(g, 40, 16, 2, 17, '#8a5a2b');
    R(g, 41, 16, 1, 17, '#e8e0c8');
    R(g, 32, 23, 12, 1, '#c8b88a');
    R(g, 44, 22, 3, 3, '#aab4c8');
    R(g, 29, 23, 5, 5, SKIN);
    R(g, 26, 22, 4, 4, '#6b4a2e');
    // tooth necklace
    R(g, 22, 23, 4, 3, '#efe7d2');
    // head, silver hair, yellow eye, scar
    blob(g, 24, 14, 7, 7, [SKIN_D, SKIN, '#f6d3b0', '#ffe3c8']);
    blob(g, 23, 10, 8, 5.5, ['#6e6a78', '#9a96a8', '#c4c0d0', '#e6e2f0']);
    R(g, 15, 9, 4, 8, '#9a96a8');
    R(g, 28, 13, 3, 2, '#ffd84a');
    R(g, 29, 13, 1, 2, EYE);
    R(g, 26, 12, 1, 5, '#b87858');
    R(g, 27, 18, 4, 1, SKIN_D);
}

function wolf(g) {
    const FUR = ['#3a2e2a', '#5e4e46', '#82706a', '#a8968c'];
    R(g, 6, 30, 10, 3, '#5e4e46');            // tail
    R(g, 4, 27, 4, 4, '#82706a');
    // legs with big clawed feet
    R(g, 15, 33, 8, 11, '#5e4e46');
    R(g, 26, 33, 8, 11, '#5e4e46');
    R(g, 14, 43, 10, 3, '#3a2e2a');
    R(g, 25, 43, 11, 3, '#3a2e2a');
    R(g, 34, 44, 2, 2, '#efe7d2'); R(g, 24, 44, 2, 2, '#efe7d2');
    R(g, 15, 31, 19, 5, '#4a3f4a');             // torn trousers
    R(g, 15, 35, 3, 2, '#4a3f4a'); R(g, 31, 35, 3, 2, '#4a3f4a');
    // back arm
    R(g, 9, 21, 7, 12, '#5e4e46');
    R(g, 8, 31, 4, 3, '#efe7d2');
    // hulking torso
    blob(g, 24, 25, 11.5, 9.5, FUR);
    R(g, 19, 23, 10, 9, '#a8968c');
    for (let i = 0; i < 4; i++) R(g, 20 + i * 2, 25 + (i % 2) * 3, 1, 3, '#82706a');
    // front arm with claws
    R(g, 33, 20, 7, 12, '#82706a');
    R(g, 33, 20, 2, 12, '#a8968c');
    R(g, 38, 30, 6, 3, '#82706a');
    R(g, 42, 33, 2, 3, '#efe7d2'); R(g, 39, 33, 2, 3, '#efe7d2'); R(g, 45, 31, 2, 3, '#efe7d2');
    // head: ears, snout, fangs, red eyes
    R(g, 17, 2, 4, 7, '#3a2e2a'); R(g, 18, 3, 2, 5, '#a8968c');
    R(g, 25, 1, 4, 8, '#3a2e2a'); R(g, 26, 2, 2, 5, '#a8968c');
    blob(g, 24, 12, 8.5, 7.5, FUR);
    R(g, 30, 11, 9, 6, '#82706a');
    R(g, 36, 11, 3, 2, INK);
    R(g, 30, 16, 9, 2, INK);
    R(g, 31, 16, 1, 2, '#ffffff'); R(g, 34, 16, 1, 2, '#ffffff'); R(g, 37, 16, 1, 2, '#ffffff');
    R(g, 27, 9, 4, 3, '#ff3030');
    R(g, 28, 10, 2, 1, '#ffd0c0');
}


function necromancer(g) {
    const ROBE = ['#1c1530', '#2e2352', '#4a3a7e'];
    const BONE = ['#a8a08a', '#d8d0b8', '#f2ecd8'];
    // flowing robe with ragged hem
    robe(g, 24, 20, 44, 8, 13, ROBE);
    for (let x = 11; x < 37; x += 3) R(g, x, 44, 2, 2, ROBE[0]);
    R(g, 16, 31, 17, 2, '#6a5aa8');
    R(g, 23, 31, 3, 3, '#7fe08a');
    // glowing green runes on the robe
    for (const [x, y] of [[18, 36], [29, 38], [23, 40], [15, 41]]) R(g, x, y, 1, 2, '#7fe08a');
    // arm and bony hand
    R(g, 31, 24, 7, 5, ROBE[1]);
    R(g, 31, 24, 7, 1, ROBE[2]);
    R(g, 37, 25, 3, 4, BONE[1]);
    // skull staff with green flame
    R(g, 39, 11, 2, 35, '#4e3b2a');
    R(g, 40, 11, 1, 35, '#2e2218');
    blob(g, 40, 7, 4.6, 4.2, BONE);
    R(g, 38, 6, 2, 2, '#1a1424');
    R(g, 41, 6, 2, 2, '#1a1424');
    R(g, 39, 10, 3, 1, '#1a1424');
    R(g, 38, 1, 1, 2, '#7fe08a'); R(g, 40, 0, 2, 3, '#b8ffc0'); R(g, 43, 2, 1, 2, '#7fe08a');
    R(g, 36, 4, 1, 1, '#b8ffc0');
    // hood with shadowed face and glowing eyes
    blob(g, 23, 15, 9, 8.5, ROBE.concat(['#5a4a96']));
    R(g, 18, 13, 10, 9, '#0e0a1a');
    R(g, 20, 17, 8, 5, BONE[1]);
    R(g, 20, 17, 8, 1, BONE[2]);
    R(g, 21, 15, 2, 2, '#7fe08a');
    R(g, 25, 15, 2, 2, '#7fe08a');
    R(g, 22, 21, 4, 1, '#1a1424');
    R(g, 23, 20, 1, 1, '#1a1424'); R(g, 25, 20, 1, 1, '#1a1424');
    // hood tip
    R(g, 21, 5, 5, 2, ROBE[1]);
    R(g, 22, 3, 3, 2, ROBE[0]);
}

const DRAWERS = { hero_knight: knight, hero_archer: archer, hero_mage: mage, hero_lycan: lycan, hero_lycan_wolf: wolf, hero_necromancer: necromancer };

let cache = null;

export function getHeroSheet() {
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
        g.save();
        g.translate(rightX + CELL * 2, 0);
        g.scale(-1, 1);
        g.drawImage(frame.c, 0, 0);
        g.restore();
        units[name] = { right: [i * 2, 0], left: [i * 2 + 1, 0] };
    });
    cache = { canvas: c, cell: CELL, units };
    return cache;
}