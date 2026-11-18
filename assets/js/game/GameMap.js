import { getArt, tileHash } from './art.js';
export const TILE = 32;
export const TileType = { GRASS: 0, DIRT: 1, TREE: 2, ROCK: 3, WATER: 4 };
export const MINI_COLORS = ['#3f7d3a', '#8a6a3b', '#2d5a2b', '#7d7d85', '#2f5f9e'];
const GRASS_SHADES = ['#3f7d3a', '#3a7436', '#438340'];


function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export const MAPS = {
    1: {
        name: 'Greenfield', seed: 1337, trees: 0.07, rocks: 0.03,
        base: { tx: 7, ty: 46 },
        mines: [{ tx: 14, ty: 44 }],   // one endless mine
        nests: [{ tx: 86, ty: 10 }, { tx: 84, ty: 28 }, { tx: 52, ty: 8 }, { tx: 60, ty: 44 }],
        lakes: [{ cx: 56, cy: 24, rx: 8, ry: 5 }],
    },
    2: {
        name: 'Twin Lakes', seed: 2024, trees: 0.09, rocks: 0.03,
        base: { tx: 8, ty: 8 },
        mines: [{ tx: 15, ty: 10 }],   // one endless mine
        nests: [{ tx: 86, ty: 44 }, { tx: 84, ty: 24 }, { tx: 56, ty: 48 }, { tx: 50, ty: 6 }],
        lakes: [{ cx: 40, cy: 22, rx: 9, ry: 6 }, { cx: 66, cy: 36, rx: 8, ry: 5 }],
    },
    3: {
        name: 'Stonepass', seed: 777, trees: 0.05, rocks: 0.08,
        base: { tx: 48, ty: 47 },
        mines: [{ tx: 40, ty: 45 }],   // one endless mine
        nests: [{ tx: 8, ty: 8 }, { tx: 88, ty: 8 }, { tx: 8, ty: 28 }, { tx: 88, ty: 28 }],
        lakes: [{ cx: 48, cy: 22, rx: 7, ry: 4 }],
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

            this.playerBase = { ...def.base };
            this.mines = def.mines.map((m) => ({ ...m }));
            this.nests = def.nests.map((n) => ({ ...n }));

            this.tiles = [];
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

    carvePath(a, b) {
        const steps = Math.max(Math.abs(b.tx - a.tx), Math.abs(b.ty - a.ty));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.round(a.tx + (b.tx - a.tx) * t);
            const y = Math.round(a.ty + (b.ty - a.ty) * t + Math.sin(t * 6) * 1.5);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) this.set(x + dx, y + dy, TileType.DIRT);
            }
        }
    }

    generate() {
        const def = this.def;
        const rng = mulberry32(this.seed);
        for (let ty = 0; ty < this.rows; ty++) {
            const row = [];
            for (let tx = 0; tx < this.cols; tx++) {
                const edge = tx === 0 || ty === 0 || tx === this.cols - 1 || ty === this.rows - 1;
                const r = rng();
                if (edge || r < def.trees) row.push(TileType.TREE);
                else if (r < def.trees + def.rocks) row.push(TileType.ROCK);
                else row.push(TileType.GRASS);
            }
            this.tiles.push(row);
        }

        for (const lake of def.lakes) {
            for (let ty = 0; ty < this.rows; ty++) {
                for (let tx = 0; tx < this.cols; tx++) {
                    if (((tx - lake.cx) / lake.rx) ** 2 + ((ty - lake.cy) / lake.ry) ** 2 <= 1) this.tiles[ty][tx] = TileType.WATER;
                }
            }
        }

        // Open ground around the important spots, then paths from the base to every nest
        this.clearArea(this.playerBase.tx, this.playerBase.ty, 5);
        this.mines.forEach((m) => this.clearArea(m.tx, m.ty, 2));
        this.nests.forEach((n) => this.clearArea(n.tx, n.ty, 4));
        this.nests.forEach((n) => this.carvePath(this.playerBase, n));
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
        const art = getArt();
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

}