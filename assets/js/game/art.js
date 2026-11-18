// Art.js - draws every environment sprite in code when the game starts.
// No image files are needed: tiles, trees, rocks, the statue and the mine are
// painted pixel by pixel onto small off-screen canvases, then reused every frame.

const T = 32;

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function make(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c, g };
}

function dot(g, col, x, y, w = 1, h = 1) {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), w, h);
}

// Ellipse lit from the top-left. P = [dark, base, light, highlight]
function blob(g, cx, cy, rx, ry, P) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
            const u = (x + 0.5 - cx) / rx;
            const v = (y + 0.5 - cy) / ry;
            if (u * u + v * v > 1) continue;
            const light = -(0.6 * u + 0.8 * v);
            let col = P[1];
            if (light > 0.62) col = (x + y) % 2 === 0 ? P[3] : P[2];
            else if (light > 0.22) col = P[2];
            else if (light < -0.5) col = P[0];
            dot(g, col, x, y);
        }
    }
}

// 1px dark outline around everything that is painted
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

function shadow(g, cx, cy, rx, ry, a = 0.28) {
    g.fillStyle = 'rgba(0, 0, 0, ' + a + ')';
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
            const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
            if (u * u + v * v <= 1) g.fillRect(x, y, 1, 1);
        }
    }
}

// ---------- ground tiles ----------

function grassTile(seed, base, flowers) {
    const { c, g } = make(T, T);
    const r = rng(seed);
    dot(g, base[0], 0, 0, T, T);
    for (let i = 0; i < 26; i++) dot(g, base[1], r() * T, r() * T, r() < 0.3 ? 2 : 1, 1);
    for (let i = 0; i < 16; i++) dot(g, base[2], r() * T, r() * T, 1, 1);
    for (let i = 0; i < 4; i++) {       // small grass tufts
        const x = 2 + Math.floor(r() * 27), y = 4 + Math.floor(r() * 24);
        dot(g, base[3], x, y, 1, 2);
        dot(g, base[3], x + 2, y, 1, 2);
        dot(g, base[4], x + 1, y - 1, 1, 3);
    }
    if (flowers) {
        const cols = ['#fff6d8', '#ffd84a', '#ff8fb8', '#9fd0ff'];
        for (let i = 0; i < flowers; i++) {
            const x = 3 + Math.floor(r() * 25), y = 3 + Math.floor(r() * 25);
            dot(g, '#2f6a2c', x, y + 1, 1, 1);
            dot(g, cols[Math.floor(r() * cols.length)], x, y, 1, 1);
        }
    }
    return c;
}

function dirtTile(seed) {
    const { c, g } = make(T, T);
    const r = rng(seed);
    dot(g, '#8c6b3d', 0, 0, T, T);
    for (let i = 0; i < 30; i++) dot(g, '#7c5e34', r() * T, r() * T, r() < 0.3 ? 2 : 1, 1);
    for (let i = 0; i < 18; i++) dot(g, '#9b7a47', r() * T, r() * T, 1, 1);
    for (let i = 0; i < 3; i++) {       // pebbles
        const x = 2 + Math.floor(r() * 27), y = 2 + Math.floor(r() * 27);
        dot(g, '#6a4f2c', x, y + 1, 2, 1);
        dot(g, '#b49a6c', x, y, 2, 1);
    }
    return c;
}

function waterTile(frame) {
    const { c, g } = make(T, T);
    dot(g, '#2d6cb0', 0, 0, T, T);
    for (let y = 0; y < T; y += 2) {
        if ((y / 2) % 2 === 0) dot(g, '#2a64a6', 0, y, T, 1);
    }
    // wave streaks: the pattern repeats every 32px so neighbouring tiles line up
    const lines = [[3, 0], [9, 12], [15, 5], [21, 20], [27, 9]];
    lines.forEach(([y, off], i) => {
        const x0 = (off + frame * 8 + i * 3) % T;
        for (let k = 0; k < 7; k++) dot(g, '#4f90d2', (x0 + k) % T, y, 1, 1);
        for (let k = 1; k < 5; k++) dot(g, '#7fb6e8', (x0 + k) % T, y - 1, 1, 1);
    });
    const r = rng(7 + frame);
    for (let i = 0; i < 3; i++) dot(g, '#c9e6fa', Math.floor(r() * T), Math.floor(r() * T), 1, 1);
    return c;
}

// Soft ragged band along one side (0 top, 1 right, 2 bottom, 3 left)
function edge(side, seed, layers) {
    const { c, g } = make(T, T);
    const r = rng(seed);
    for (let i = 0; i < T; i++) {
        layers.forEach((L, k) => {
            if (r() > L.p) return;
            let x = i, y = k;
            if (side === 1) { x = T - 1 - k; y = i; }
            else if (side === 2) { x = i; y = T - 1 - k; }
            else if (side === 3) { x = k; y = i; }
            dot(g, r() < 0.2 && L.alt ? L.alt : L.col, x, y);
        });
    }
    return c;
}

const DIRT_EDGE = [
    { col: '#8c6b3d', alt: '#7c5e34', p: 0.95 },
    { col: '#8c6b3d', alt: '#7c5e34', p: 0.7 },
    { col: '#8c6b3d', alt: '#7c5e34', p: 0.4 },
    { col: '#7c5e34', p: 0.15 },
];
const SHORE_EDGE = [
    { col: '#dcc784', alt: '#b99d5c', p: 0.98 },
    { col: '#dcc784', alt: '#b99d5c', p: 0.8 },
    { col: '#b99d5c', p: 0.3 },
];
const FOAM_EDGE = [
    { col: '#e3f3fc', alt: '#a9d6f2', p: 0.7 },
    { col: '#8fc4e8', p: 0.55 },
    { col: '#5b9ad8', p: 0.25 },
];

// ---------- objects ----------

const LEAF = ['#1d5328', '#2f7d35', '#48a447', '#7acb60'];

function leafSpeckle(g, shape, seed, n) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
        const x = Math.floor(3 + r() * 26), y = Math.floor(3 + r() * 32);
        if (!shape(x, y)) continue;
        dot(g, r() < 0.5 ? '#245f2c' : '#5fb552', x, y, 1, 1);
    }
}

function treeRound(seed, scale) {
    const { c, g } = make(32, 48);
    shadow(g, 16, 44, 11 * scale, 3);
    dot(g, '#5a3a1e', 14, 31, 5, 13);
    dot(g, '#7a5230', 14, 31, 2, 13);
    dot(g, '#3e2813', 18, 31, 1, 13);
    dot(g, '#5a3a1e', 12, 43, 9, 1);
    const discs = [
        [9, 25, 8 * scale, 7 * scale], [23, 25, 8 * scale, 7 * scale],
        [16, 27, 9 * scale, 7 * scale], [16, 14, 11 * scale, 10 * scale],
    ];
    for (const d of discs) blob(g, d[0], d[1], d[2], d[3], LEAF);
    leafSpeckle(g, (x, y) => discs.some((d) => ((x - d[0]) / d[2]) ** 2 + ((y - d[1]) / d[3]) ** 2 < 0.85), seed, 90);
    outline(g, 32, 48, '#12331a');
    return c;
}

function treePine() {
    const { c, g } = make(32, 48);
    shadow(g, 16, 44, 9, 3);
    dot(g, '#5a3a1e', 14, 36, 4, 8);
    dot(g, '#7a5230', 14, 36, 1, 8);
    const layers = [[3, 17, 8], [12, 28, 11], [21, 38, 13]];
    for (const [top, base, half] of layers.slice().reverse()) {
        for (let y = top; y <= base; y++) {
            const w = Math.round(half * (y - top + 2) / (base - top + 2));
            for (let x = 16 - w; x <= 15 + w; x++) {
                const t = (x - (16 - w)) / (2 * w);
                let col = '#2f7d35';
                if (t < 0.28) col = (x + y) % 2 ? '#48a447' : '#7acb60';
                else if (t > 0.72) col = '#1d5328';
                if (y > base - 2) col = '#1d5328';
                dot(g, col, x, y);
            }
        }
    }
    outline(g, 32, 48, '#12331a');
    return c;
}

const ROCKP = ['#464955', '#686c78', '#8b8f9c', '#bec3cf'];

function rock(seed, moss) {
    const { c, g } = make(32, 28);
    shadow(g, 16, 23, 13, 3);
    blob(g, 16, 15, 13, 8, ROCKP);
    blob(g, 9, 17, 7, 5, ROCKP);
    blob(g, 23, 16, 8, 6, ROCKP);
    const r = rng(seed);
    for (let i = 0; i < 3; i++) {                 // cracks
        const x = 8 + Math.floor(r() * 16), y = 13 + Math.floor(r() * 7);
        dot(g, '#3a3c46', x, y, 1, 2);
        dot(g, '#3a3c46', x + 1, y + 2, 1, 1);
    }
    if (moss) for (let i = 0; i < 14; i++) dot(g, i % 3 ? '#4f9a45' : '#7acb60', 8 + r() * 14, 9 + r() * 4, 1, 1);
    outline(g, 32, 28, '#26282f');
    return c;
}

function statueBase() {
    const W = 64, H = 112;
    const { c, g } = make(W, H);
    shadow(g, 32, 106, 30, 5, 0.32);
    // step 1
    dot(g, '#7f8593', 4, 96, 56, 10);
    dot(g, '#b2b8c6', 4, 96, 56, 2);
    dot(g, '#575c69', 4, 104, 56, 2);
    for (let x = 10; x < 60; x += 11) dot(g, '#6a707e', x, 98, 1, 6);
    // step 2
    dot(g, '#8a90a0', 10, 88, 44, 8);
    dot(g, '#bcc2d0', 10, 88, 44, 2);
    dot(g, '#5f6573', 10, 94, 44, 2);
    for (let x = 16; x < 54; x += 9) dot(g, '#737a89', x, 90, 1, 4);
    // pillar
    dot(g, '#8a90a0', 21, 52, 22, 36);
    dot(g, '#b6bccb', 21, 52, 3, 36);
    dot(g, '#a0a6b5', 24, 52, 2, 36);
    dot(g, '#5f6573', 39, 52, 4, 36);
    for (let y = 56; y < 88; y += 8) dot(g, '#737a89', 25, y, 13, 1);
    // glowing runes
    const rune = (y) => {
        dot(g, '#6c3bb8', 29, y - 1, 5, 5);
        dot(g, '#b57bff', 31, y - 1, 1, 5);
        dot(g, '#b57bff', 29, y + 1, 5, 1);
        dot(g, '#efe0ff', 31, y + 1, 1, 1);
    };
    rune(60); rune(70); rune(80);
    // cap and cup
    dot(g, '#a0a6b5', 17, 46, 30, 6);
    dot(g, '#c8cedb', 17, 46, 30, 2);
    dot(g, '#5f6573', 17, 51, 30, 1);
    dot(g, '#8a90a0', 25, 42, 14, 4);
    dot(g, '#c8cedb', 25, 42, 14, 1);
    outline(g, W, H, '#232733');
    return c;
}

function crystal() {
    const W = 16, H = 28;
    const { c, g } = make(W, H);
    const mid = 14;
    for (let y = 1; y < H - 1; y++) {
        const k = 1 - Math.abs(y - mid) / mid;
        const half = Math.max(1, Math.round(6.5 * Math.pow(k, 0.7)));
        for (let x = 8 - half; x < 8 + half; x++) {
            let col = '#8a4fe0';
            if (x < 8 - half * 0.35) col = '#b98aff';
            else if (x >= 8 + half * 0.35) col = '#5b2aa8';
            if (y < mid && x === 8 - 1) col = '#efe0ff';
            dot(g, col, x, y);
        }
    }
    dot(g, '#ffffff', 6, 8, 1, 2);
    outline(g, W, H, '#2d1260');
    return c;
}

function glow(size, color) {
    const { c, g } = make(size, size);
    const grad = g.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(' + color + ', 0.55)');
    grad.addColorStop(1, 'rgba(' + color + ', 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
}

const MOUNTP = ['#3d3834', '#5d554e', '#867b6f', '#b3a898'];

function mine(full) {
    const W = 48, H = 48;
    const { c, g } = make(W, H);
    shadow(g, 24, 43, 22, 4, 0.32);
    blob(g, 24, 30, 22, 16, MOUNTP);
    blob(g, 11, 33, 10, 10, MOUNTP);
    blob(g, 37, 32, 11, 11, MOUNTP);
    g.clearRect(0, 43, W, 5);
    // cave opening
    dot(g, '#120f0d', 16, 27, 16, 17);
    dot(g, '#120f0d', 17, 25, 14, 2);
    dot(g, '#1c1815', 17, 38, 14, 6);
    // timber frame
    dot(g, '#8a5a2b', 14, 26, 3, 18);
    dot(g, '#b57a3c', 14, 26, 1, 18);
    dot(g, '#8a5a2b', 31, 26, 3, 18);
    dot(g, '#5e3b1b', 33, 26, 1, 18);
    dot(g, '#8a5a2b', 13, 22, 22, 5);
    dot(g, '#b57a3c', 13, 22, 22, 1);
    dot(g, '#5e3b1b', 13, 26, 22, 1);
    for (let x = 17; x < 35; x += 5) dot(g, '#6e4620', x, 23, 1, 3);
    // gold
    const r = rng(11);
    const ore = full ? ['#ffd84a', '#fff2a0', '#b8860b'] : ['#7a756e', '#9a948b', '#55504a'];
    const spots = [[6, 31], [10, 24], [38, 29], [41, 36], [8, 38], [36, 22], [27, 17], [20, 15], [30, 13], [14, 17]];
    for (const [x, y] of spots) {
        dot(g, ore[2], x, y + 1, 3, 1);
        dot(g, ore[0], x, y, 3, 1);
        dot(g, ore[0], x + 1, y - 1, 1, 1);
        dot(g, ore[1], x, y, 1, 1);
    }
    if (full) {
        for (let i = 0; i < 5; i++) {
            const x = 18 + Math.floor(r() * 11), y = 40 + Math.floor(r() * 3);
            dot(g, '#b8860b', x, y + 1, 3, 1);
            dot(g, '#ffd84a', x, y, 3, 1);
            dot(g, '#fff2a0', x, y, 1, 1);
        }
    }
    outline(g, W, H, '#1e1a17');
    return c;
}

const NESTP = ['#2a1518', '#4a2a2e', '#6e4048', '#9a5a62'];

function bone(g, x, y, h, flip) {          // a horn / fang pointing up
    for (let i = 0; i < h; i++) {
        const w = Math.max(1, Math.round(3 * (i + 1) / h));
        for (let k = 0; k < w; k++) {
            const px = x - Math.floor(w / 2) + k;
            dot(g, k === w - 1 && w > 1 ? '#a89c80' : '#d9cfb4', px + (flip ? 0 : 0), y - h + 1 + i);
        }
    }
}

function skull(g, x, y) {
    dot(g, '#d9cfb4', x, y, 6, 4);
    dot(g, '#d9cfb4', x + 1, y + 4, 4, 2);
    dot(g, '#2a1518', x + 1, y + 1, 1, 2);
    dot(g, '#2a1518', x + 4, y + 1, 1, 2);
    dot(g, '#a89c80', x + 5, y, 1, 5);
}

function nest() {
    const W = 64, H = 64;
    const { c, g } = make(W, H);
    shadow(g, 32, 57, 29, 5, 0.38);
    blob(g, 32, 40, 29, 19, NESTP);
    blob(g, 13, 46, 12, 10, NESTP);
    blob(g, 51, 46, 13, 10, NESTP);
    g.clearRect(0, 58, W, 6);
    // glowing maw
    for (let y = 28; y <= 56; y++) {
        for (let x = 10; x <= 54; x++) {
            const u = (x + 0.5 - 32) / 15, v = (y + 0.5 - 42) / 10;
            const d = u * u + v * v;
            if (d <= 0.55) dot(g, '#0e0507', x, y);
            else if (d <= 1) dot(g, (x + y) % 3 ? '#8a1f2a' : '#d83a3a', x, y);
        }
    }
    for (let y = 40; y <= 48; y++) {
        for (let x = 24; x <= 40; x++) {
            const u = (x + 0.5 - 32) / 8, v = (y + 0.5 - 44) / 4.5;
            if (u * u + v * v <= 1) dot(g, (x + y) % 2 ? '#ff7a30' : '#e24a2a', x, y);
        }
    }
    // fangs and skulls around the rim
    [[10, 38, 9], [17, 31, 11], [25, 28, 8], [39, 28, 8], [47, 31, 11], [54, 38, 9]].forEach(([x, y, h]) => bone(g, x, y, h));
    skull(g, 5, 49);
    skull(g, 53, 51);
    dot(g, '#d9cfb4', 20, 53, 5, 1);
    dot(g, '#d9cfb4', 40, 54, 6, 1);
    outline(g, W, H, '#150a0c');
    return c;
}

// ---------- lighting overlay ----------

function vignette(w, h) {
    const { c, g } = make(w, h);
    const grad = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.68);
    grad.addColorStop(0, 'rgba(10, 8, 30, 0)');
    grad.addColorStop(1, 'rgba(10, 8, 30, 0.5)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255, 200, 120, 0.04)';   // warm daylight
    g.fillRect(0, 0, w, h);
    return c;
}

// ---------- public API ----------

let cache = null;

export function getArt() {
    if (cache) return cache;
    const greens = [
        ['#4b8f3b', '#438536', '#59a046', '#2f6a2c', '#6cbc55'],
        ['#4a8e3a', '#428435', '#58a045', '#2f6a2c', '#6cbc55'],
        ['#4c903c', '#448637', '#5aa247', '#2f6a2c', '#7ccb61'],
        ['#4a8d3a', '#428436', '#57a044', '#2d6829', '#66b24f'],
    ];
    cache = {
        T,
        grass: greens.flatMap((p, i) => [grassTile(100 + i, p, 0), grassTile(200 + i, p, i % 2 ? 2 : 0)]),
        dirt: [0, 1, 2, 3].map((i) => dirtTile(300 + i)),
        water: [0, 1, 2, 3].map(waterTile),
        dirtEdge: [0, 1, 2, 3].map((s) => edge(s, 400 + s, DIRT_EDGE)),
        shoreEdge: [0, 1, 2, 3].map((s) => edge(s, 500 + s, SHORE_EDGE)),
        foamEdge: [0, 1, 2, 3].map((s) => edge(s, 600 + s, FOAM_EDGE)),
        trees: [treeRound(1, 1), treeRound(2, 0.86), treePine()],
        rocks: [rock(1, false), rock(2, true)],
        statue: statueBase(),
        crystal: crystal(),
        crystalGlow: glow(72, '176, 112, 255'),
        mine: [mine(true), mine(false)],
        nest: nest(),
        nestGlow: glow(96, '255, 70, 50'),
        vignette: vignette(640, 360),
    };
    return cache;
}

// Deterministic per-tile pick so the map looks the same every frame
export function tileHash(tx, ty) {
    let h = Math.imul(tx, 374761393) + Math.imul(ty, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
}