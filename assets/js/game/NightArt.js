// NightArt.js - pixel art for the night monsters: Zombie, Ghoul (32px cells) and the Bone Colossus boss (64px cell).
// A hand-drawn entry in units.json with the same sprite_key (zombie, ghoul, boss_bone) always wins over these.

const INK = '#1a1424';

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


function zombie(g) {
    const SK = ['#3c5a30', '#5d8a46', '#86b865', '#a8d684'];
    R(g, 11, 22, 4, 7, '#3a3a52'); R(g, 17, 22, 4, 7, '#3a3a52');        // ragged trousers
    R(g, 10, 28, 5, 2, '#4a3a2a'); R(g, 17, 28, 5, 2, '#4a3a2a');
    R(g, 10, 12, 12, 11, '#6a5a78');                                      // torn shirt
    R(g, 10, 12, 3, 11, '#8a7a98');
    R(g, 12, 19, 2, 4, SK[1]); R(g, 17, 21, 3, 2, SK[1]);                 // skin showing through rips
    R(g, 21, 13, 8, 3, SK[1]); R(g, 21, 13, 8, 1, SK[2]);                 // arm stretched out
    R(g, 28, 12, 3, 5, SK[2]);
    R(g, 6, 14, 5, 3, SK[0]);                                             // back arm
    blob(g, 16, 8, 5.5, 5.5, SK);
    R(g, 17, 6, 3, 3, '#f2e8a0'); R(g, 18, 7, 1, 1, '#a02020');          // one cloudy eye
    R(g, 13, 7, 2, 2, '#1a1424');
    R(g, 14, 11, 5, 1, '#1a1424'); R(g, 15, 11, 1, 1, '#e8e0c8'); R(g, 17, 11, 1, 1, '#e8e0c8');
    R(g, 11, 3, 3, 2, '#2a3a20');                                         // patchy hair
}

function ghoul(g) {
    const SK = ['#3a3e4e', '#5a6078', '#7c849e', '#a0a8c0'];
    R(g, 9, 23, 4, 6, SK[0]); R(g, 17, 23, 4, 6, SK[0]);                  // thin legs
    R(g, 8, 28, 6, 2, '#e8e0c8'); R(g, 16, 28, 6, 2, '#e8e0c8');          // claws on feet
    blob(g, 14, 17, 7.5, 7, SK);                                          // hunched torso
    for (let i = 0; i < 3; i++) R(g, 10 + i * 3, 14 + (i % 2), 1, 4, SK[0]);   // ribs
    R(g, 19, 17, 10, 3, SK[1]);                                           // long arm
    R(g, 27, 18, 4, 2, '#e8e0c8'); R(g, 28, 16, 3, 1, '#e8e0c8'); R(g, 28, 21, 3, 1, '#e8e0c8');
    R(g, 3, 17, 7, 3, SK[0]);
    R(g, 1, 18, 3, 1, '#e8e0c8');
    blob(g, 20, 9, 5, 5, SK);                                             // head low and forward
    R(g, 21, 8, 2, 2, '#ff3030'); R(g, 24, 8, 2, 2, '#ff3030');
    R(g, 21, 12, 6, 2, '#1a1424');
    for (const x of [21, 23, 25]) R(g, x, 12, 1, 2, '#e8e0c8');
    R(g, 15, 5, 2, 2, SK[0]); R(g, 22, 4, 2, 2, SK[0]);                   // ragged ears
}

function colossus(g) {
    const B = ['#7a7462', '#b0a88e', '#d8d0b4', '#f2ecd6'];
    const GLOW = '#7fe08a';
    // legs and pelvis
    R(g, 20, 44, 8, 16, B[1]); R(g, 36, 44, 8, 16, B[1]);
    R(g, 20, 44, 2, 16, B[2]); R(g, 36, 44, 2, 16, B[2]);
    R(g, 17, 58, 14, 5, B[2]); R(g, 33, 58, 14, 5, B[2]);
    R(g, 18, 40, 28, 7, B[1]);
    R(g, 18, 40, 28, 1, B[3]);
    // spine and ribcage
    R(g, 30, 22, 4, 20, B[0]);
    for (let i = 0; i < 4; i++) {
        const y = 24 + i * 4, w = 14 - i * 1;
        R(g, 32 - w, y, w * 2, 2, B[2]);
        R(g, 32 - w, y, w * 2, 1, B[3]);
        R(g, 30, y, 4, 2, B[0]);
    }
    R(g, 26, 29, 12, 2, GLOW);                                            // glowing soul in the chest
    // shoulders and arms
    blob(g, 14, 22, 6, 5, B); blob(g, 50, 22, 6, 5, B);
    R(g, 9, 24, 6, 20, B[1]); R(g, 9, 24, 2, 20, B[2]);
    R(g, 49, 24, 6, 22, B[1]); R(g, 53, 24, 2, 22, B[0]);
    R(g, 6, 44, 11, 6, B[2]);                                             // fists
    R(g, 47, 46, 11, 6, B[2]);
    R(g, 5, 49, 2, 3, B[3]); R(g, 9, 49, 2, 3, B[3]); R(g, 13, 49, 2, 3, B[3]);
    // club bone in the right hand
    R(g, 55, 20, 4, 30, '#cfc7aa'); R(g, 53, 16, 8, 6, B[2]);
    // skull with horns
    blob(g, 32, 12, 9, 8, B);
    R(g, 25, 11, 5, 4, '#1a1424'); R(g, 34, 11, 5, 4, '#1a1424');
    R(g, 26, 12, 3, 2, GLOW); R(g, 35, 12, 3, 2, GLOW);
    R(g, 31, 15, 2, 2, '#1a1424');
    R(g, 26, 18, 12, 3, B[2]);
    for (let x = 27; x < 38; x += 2) R(g, x, 18, 1, 3, '#1a1424');
    R(g, 19, 6, 3, 3, B[2]); R(g, 17, 2, 3, 5, B[3]);                    // left horn
    R(g, 42, 6, 3, 3, B[2]); R(g, 44, 2, 3, 5, B[3]);                    // right horn
}

function sheet(drawers, cell) {
    const names = Object.keys(drawers);
    const { c, g } = make(cell * names.length * 2, cell);
    const units = {};
    names.forEach((name, i) => {
        const frame = make(cell, cell);
        drawers[name](frame.g);
        outline(frame.g, cell, cell, INK);
        const rightX = i * 2 * cell;
        g.drawImage(frame.c, rightX, 0);
        g.save();
        g.translate(rightX + cell * 2, 0);
        g.scale(-1, 1);
        g.drawImage(frame.c, 0, 0);
        g.restore();
        units[name] = { right: [i * 2, 0], left: [i * 2 + 1, 0] };
    });
    return { canvas: c, cell, units };
}

let mobCache = null, bossCache = null;

export function getNightSheet(key) {
    if (key === 'boss_bone') return bossCache || (bossCache = sheet({ boss_bone: colossus }, 64));
    return mobCache || (mobCache = sheet({ zombie, ghoul }, 32));
}