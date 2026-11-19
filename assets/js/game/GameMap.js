import { getArt, tileHash } from './art.js';
export const TILE = 32;
export const TileType = { GRASS: 0, DIRT: 1, TREE: 2, ROCK: 3, WATER: 4 };
// The minimap reads this array; a new GameMap rewrites it in place with its own theme colours.
export const MINI_COLORS = ['#3f7d3a', '#8a6a3b', '#2d5a2b', '#7d7d85', '#2f5f9e'];

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Smooth value noise (0..1) so forests and rocks grow in natural clumps instead of random speckle.
function makeNoise(seed) {
    const r = mulberry32(seed);
    const G = 64, grid = Array.from({ length: G * G }, () => r());
    const at = (x, y) => grid[((y % G) + G) % G * G + ((x % G) + G) % G];
    const sm = (t) => t * t * (3 - 2 * t);
    return (x, y) => {
        const x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0);
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
        return a + (b - a) * fy;
    };
}

export const MAPS = {
    1: {
        name: 'Greenfield', theme: 'meadow', seed: 1337, trees: 0.07, rocks: 0.03,
        base: { tx: 7, ty: 46 },
        mines: [{ tx: 14, ty: 44 }],   // one endless mine
        nests: [{ tx: 86, ty: 10 }, { tx: 84, ty: 28 }, { tx: 52, ty: 8 }, { tx: 60, ty: 44 }],
        lakes: [{ cx: 56, cy: 24, rx: 8, ry: 5 }],
    },
    2: {
        name: 'Twin Lakes', theme: 'lakes', seed: 2024, trees: 0.09, rocks: 0.03,
        base: { tx: 8, ty: 8 },
        mines: [{ tx: 15, ty: 10 }],
        nests: [{ tx: 86, ty: 44 }, { tx: 84, ty: 24 }, { tx: 56, ty: 48 }, { tx: 50, ty: 6 }],
        lakes: [{ cx: 40, cy: 22, rx: 9, ry: 6 }, { cx: 66, cy: 36, rx: 8, ry: 5 }],
    },
    3: {
        name: 'Stonepass', theme: 'highland', seed: 777, trees: 0.05, rocks: 0.08,
        base: { tx: 48, ty: 47 },
        mines: [{ tx: 40, ty: 45 }],
        nests: [{ tx: 8, ty: 8 }, { tx: 88, ty: 8 }, { tx: 8, ty: 28 }, { tx: 88, ty: 28 }],
        lakes: [{ cx: 48, cy: 22, rx: 7, ry: 4 }],
        // ridges of rock with gaps (the paths from the nests cut through them)
        walls: [{ x1: 18, y1: 36, x2: 40, y2: 30 }, { x1: 58, y1: 30, x2: 80, y2: 36 }, { x1: 22, y1: 16, x2: 42, y2: 14 }, { x1: 56, y1: 14, x2: 76, y2: 16 }],
    },
    4: {
        name: 'Frostveil', theme: 'frost', seed: 4242, trees: 0.1, rocks: 0.04,
        base: { tx: 88, ty: 8 },
        mines: [{ tx: 81, ty: 10 }],
        nests: [{ tx: 8, ty: 46 }, { tx: 10, ty: 22 }, { tx: 46, ty: 48 }, { tx: 52, ty: 26 }],
        lakes: [{ cx: 62, cy: 14, rx: 7, ry: 4 }, { cx: 30, cy: 34, rx: 11, ry: 6 }, { cx: 72, cy: 40, rx: 6, ry: 4 }],
    },
};

export class GameMap {
    constructor(mapId = 1, cols = 96, rows = 54) {
        const def = MAPS[mapId] || MAPS[1];
        this.def = def;
        this.cols = cols;
        this.rows = rows;
        this.seed = def.seed;
        this.widthPx = cols * TILE;
        this.heightPx = rows * TILE;
        this.theme = def.theme || 'meadow';

        this.playerBase = { ...def.base };
        this.mines = def.mines.map((m) => ({ ...m }));
        this.nests = def.nests.map((n) => ({ ...n }));

        this.art = getArt(this.theme);
        this.art.mini.forEach((c, i) => { MINI_COLORS[i] = c; });

        this.tiles = [];
        this.decor = [];
        this.flakes = Array.from({ length: 70 }, (_, i) => ({ x: (i * 97) % 640, y: (i * 53) % 360, s: 0.4 + (i % 7) / 7, p: i }));
        this.generate();
    }

    set(tx, ty, type) {
        if (tx >= 0 && ty >= 0 && tx < this.cols && ty < this.rows) this.tiles[ty][tx] = type;
    }

    clearArea(tx, ty, radius) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = tx + dx, y = ty + dy;
                if (x > 0 && y > 0 && x < this.cols - 1 && y < this.rows - 1) this.tiles[y][x] = TileType.GRASS;
            }
        }
    }

    carvePath(a, b, phase = 0) {
        const steps = Math.max(Math.abs(b.tx - a.tx), Math.abs(b.ty - a.ty));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.round(a.tx + (b.tx - a.tx) * t + Math.sin(t * 5 + phase) * 1.2);
            const y = Math.round(a.ty + (b.ty - a.ty) * t + Math.sin(t * 6 + phase) * 1.8);
            // a plus-shaped stamp keeps the trail about 2-3 tiles wide with a soft, uneven edge
            for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) this.set(x + dx, y + dy, TileType.DIRT);
        }
    }

    generate() {
        const def = this.def;
        const rng = mulberry32(this.seed);
        const forest = makeNoise(this.seed + 1), stones = makeNoise(this.seed + 2), warp = makeNoise(this.seed + 3);

        for (let ty = 0; ty < this.rows; ty++) {
            const row = [];
            for (let tx = 0; tx < this.cols; tx++) {
                // dense, uneven border so the edge of the world looks like a real forest wall
                const d = Math.min(tx, ty, this.cols - 1 - tx, this.rows - 1 - ty);
                const wall = d === 0 || (d < 3 && rng() < 0.75 - d * 0.28);
                const f = forest(tx * 0.12, ty * 0.12), st = stones(tx * 0.16, ty * 0.16);
                const treeP = def.trees * (0.2 + 2.1 * f * f);       // clumps: groves and clearings
                const rockP = def.rocks * (0.15 + 2.4 * st * st);
                const r = rng();
                if (wall || r < treeP) row.push(TileType.TREE);
                else if (r < treeP + rockP) row.push(TileType.ROCK);
                else row.push(TileType.GRASS);
            }
            this.tiles.push(row);
        }

        // natural-looking lakes: the shoreline wobbles with noise
        for (const lake of def.lakes) {
            for (let ty = 0; ty < this.rows; ty++) {
                for (let tx = 0; tx < this.cols; tx++) {
                    const k = ((tx - lake.cx) / lake.rx) ** 2 + ((ty - lake.cy) / lake.ry) ** 2;
                    if (k <= 0.85 + 0.55 * warp(tx * 0.25, ty * 0.25)) this.tiles[ty][tx] = TileType.WATER;
                }
            }
        }

        // rocky ridges (Stonepass)
        for (const w of def.walls || []) {
            const steps = Math.max(Math.abs(w.x2 - w.x1), Math.abs(w.y2 - w.y1));
            for (let i = 0; i <= steps; i++) {
                const x = Math.round(w.x1 + (w.x2 - w.x1) * i / steps), y = Math.round(w.y1 + (w.y2 - w.y1) * i / steps);
                for (let dy = -1; dy <= 0; dy++) if (this.tiles[y + dy] && this.tiles[y + dy][x] !== TileType.WATER) this.set(x, y + dy, TileType.ROCK);
            }
        }

        // Open ground around the important spots, then paths from the base to every nest
        this.clearArea(this.playerBase.tx, this.playerBase.ty, 5);
        this.mines.forEach((m) => this.clearArea(m.tx, m.ty, 2));
        this.nests.forEach((n) => this.clearArea(n.tx, n.ty, 4));
        this.nests.forEach((n, i) => this.carvePath(this.playerBase, n, i * 1.7));

        this.placeDecor(rng);
    }

    // Walk-through props: flowers, bushes, pebbles, snow drifts, reeds by the shore...
    placeDecor(rng) {
        const art = this.art, noise = makeNoise(this.seed + 9);
        const keep = [this.playerBase, ...this.nests, ...this.mines];
        for (let ty = 0; ty < this.rows; ty++) {
            const row = [];
            for (let tx = 0; tx < this.cols; tx++) {
                let pick = -1;
                if (this.tiles[ty][tx] === TileType.GRASS && !keep.some((k) => Math.abs(k.tx - tx) < 3 && Math.abs(k.ty - ty) < 3)) {
                    const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.typeAt(tx + dx, ty + dy, 0) === TileType.WATER);
                    const p = art.decorDensity * (0.3 + 1.6 * noise(tx * 0.2, ty * 0.2));
                    if (nearWater && art.decorShore.length && rng() < 0.35) pick = 1000 + Math.floor(rng() * art.decorShore.length);
                    else if (rng() < p) pick = Math.floor(rng() * art.decor.length);
                }
                row.push(pick);
            }
            this.decor.push(row);
        }
    }

    isBlocked(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
        const t = this.tiles[ty][tx];
        return t === TileType.TREE || t === TileType.ROCK || t === TileType.WATER;
    }

    typeAt(tx, ty, fallback) {
        if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return fallback;
        return this.tiles[ty][tx];
    }

    draw(ctx, camera) {
        const ox = Math.round(camera.x), oy = Math.round(camera.y);
        const x0 = Math.max(0, Math.floor(ox / TILE));
        const y0 = Math.max(0, Math.floor(oy / TILE));
        const x1 = Math.min(this.cols - 1, Math.floor((ox + camera.viewW) / TILE));
        const y1 = Math.min(this.rows - 1, Math.floor((oy + camera.viewH) / TILE) + 1); // +1: tall trees spill upward
        const art = this.art;
        const wave = Math.floor(performance.now() / 260) % 4;

        for (let ty = y0; ty <= y1; ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                this.drawTile(ctx, art, wave, tx, ty, tx * TILE - ox, ty * TILE - oy);
            }
        }
        this.drawMarkers(ctx, art, ox, oy, camera.viewW, camera.viewH);
    }

    drawTile(ctx, art, wave, tx, ty, sx, sy) {
        const type = this.tiles[ty][tx];
        const h = tileHash(tx, ty);
        const water = type === TileType.WATER;
        const dirt = type === TileType.DIRT;

        if (water) ctx.drawImage(art.water[wave], sx, sy);
        else if (dirt) ctx.drawImage(art.dirt[h % art.dirt.length], sx, sy);
        else ctx.drawImage(art.grass[h % art.grass.length], sx, sy);

        // soft blends where two ground types meet: [dx, dy] for top, right, bottom, left
        const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (let side = 0; side < 4; side++) {
            const n = this.typeAt(tx + SIDES[side][0], ty + SIDES[side][1], type);
            if (water) {
                if (n !== TileType.WATER) ctx.drawImage(art.foamEdge[side], sx, sy);
            } else if (n === TileType.WATER) {
                ctx.drawImage(art.shoreEdge[side], sx, sy);
            } else if (!dirt && n === TileType.DIRT) {
                ctx.drawImage(art.dirtEdge[side], sx, sy);
            }
        }

        const d = this.decor[ty] ? this.decor[ty][tx] : -1;
        if (d >= 1000) ctx.drawImage(art.decorShore[d - 1000], sx, sy);
        else if (d >= 0) ctx.drawImage(art.decor[d], sx, sy);

        if (type === TileType.TREE) ctx.drawImage(art.trees[(h >>> 4) % art.trees.length], sx, sy - 16);
        else if (type === TileType.ROCK) ctx.drawImage(art.rocks[(h >>> 4) % art.rocks.length], sx, sy + 4);
    }

    // Monster nests. (The statue is drawn by Base.js and the mines by GoldMine.js.)
    drawMarkers(ctx, art, ox, oy, viewW = 640, viewH = 360) {
        const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 350);
        for (const n of this.nests) {
            const cx = n.tx * TILE + TILE / 2 - ox;
            const cy = n.ty * TILE + TILE / 2 - oy;
            if (cx < -90 || cx > viewW + 90 || cy < -90 || cy > viewH + 90) continue;
            ctx.drawImage(art.nest, Math.round(cx - 32), Math.round(cy - 32));
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = pulse * 0.8;
            ctx.drawImage(art.nestGlow, Math.round(cx - 48), Math.round(cy + 10 - 48));
            ctx.restore();
        }
    }

    // Weather drawn over the whole view (call once, just before the vignette). Frostveil: falling snow.
    drawAmbient(ctx, camera) {
        if (this.theme !== 'frost') return;
        const W = camera.viewW, H = camera.viewH, t = performance.now() / 1000;
        ctx.save();
        ctx.fillStyle = 'rgba(190, 220, 255, 0.07)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff';
        for (const f of this.flakes) {
            const x = ((f.x * W / 640 + Math.sin(t * 0.8 + f.p) * 14 + t * 10 * f.s) % W + W) % W;
            const y = ((f.y * H / 360 + t * (22 + 30 * f.s)) % H + H) % H;
            ctx.globalAlpha = 0.45 + 0.4 * f.s;
            ctx.fillRect(Math.round(x), Math.round(y), f.s > 0.75 ? 2 : 1, f.s > 0.75 ? 2 : 1);
        }
        ctx.restore();
    }
}