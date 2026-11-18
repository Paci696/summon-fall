// RankArt.js - Elite / Godly units get their OWN pre-drawn art, and tinted units (undead, stronger waves)
// are baked once. The old code applied ctx.filter to every unit on every frame, which is very slow.
// Everything here is built once per sheet and cached, so drawing a unit is just a normal drawImage.

const cache = new Map();   // source -> Map(key -> canvas)

function srcSize(source) {
    return { w: source.naturalWidth || source.width, h: source.naturalHeight || source.height };
}

function make(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

function remember(source, key, build) {
    let per = cache.get(source);
    if (!per) { per = new Map(); cache.set(source, per); }
    if (!per.has(key)) per.set(key, build());
    return per.get(key);
}

// whole sheet with one colour filter applied ONCE (not every frame)
export function tintSheet(source, filter) {
    if (!filter) return source;
    return remember(source, 'tint:' + filter, () => {
        const { w, h } = srcSize(source);
        const c = make(w, h);
        const g = c.getContext('2d');
        g.filter = filter;
        g.drawImage(source, 0, 0);
        return c;
    });
}

// bounding box of the visible pixels of a cell
function bounds(g, cell) {
    const d = g.getImageData(0, 0, cell, cell).data;
    let x0 = cell, y0 = cell, x1 = -1, y1 = -1;
    for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
            if (d[(y * cell + x) * 4 + 3] > 40) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
}

function silhouette(cellCanvas, cell, color) {
    const c = make(cell, cell);
    const g = c.getContext('2d');
    g.drawImage(cellCanvas, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, cell, cell);
    return c;
}

function px(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), w, h);
}

const LOOKS = {
    1: {   // ELITE: steel-blue rim light, brighter colours, blue gem above the head
        body: 'saturate(1.3) brightness(1.12) contrast(1.05)',
        rim: '#5cc8ff',
        decorate(g, b) {
            const cx = Math.round((b.x0 + b.x1) / 2), y = Math.max(0, b.y0 - 5);
            px(g, cx, y, 1, 1, '#d8f4ff');
            px(g, cx - 1, y + 1, 3, 1, '#5cc8ff');
            px(g, cx, y + 2, 1, 1, '#2e86c8');
            px(g, cx - 1, y + 1, 1, 1, '#a8e6ff');
        },
    },
    2: {   // GODLY: golden glow, warm bright colours, halo and sparkles
        body: 'sepia(0.25) saturate(1.6) brightness(1.2)',
        rim: '#ffd24a',
        decorate(g, b, cell) {
            const cx = Math.round((b.x0 + b.x1) / 2), y = Math.max(1, b.y0 - 4);
            // halo ring
            px(g, cx - 3, y, 7, 1, '#fff2a0');
            px(g, cx - 4, y + 1, 1, 1, '#ffd24a'); px(g, cx + 4, y + 1, 1, 1, '#ffd24a');
            px(g, cx - 3, y + 2, 7, 1, '#ffb800');
            // sparkles on both sides
            const sy = Math.round((b.y0 + b.y1) / 2);
            px(g, Math.max(0, b.x0 - 2), sy - 3, 1, 3, '#fff2a0'); px(g, Math.max(0, b.x0 - 3), sy - 2, 3, 1, '#fff2a0');
            px(g, Math.min(cell - 1, b.x1 + 2), sy + 2, 1, 3, '#fff2a0'); px(g, Math.min(cell - 2, b.x1 + 1), sy + 3, 3, 1, '#fff2a0');
        },
    },
};

// Elite (rank 1) / Godly (rank 2) version of a whole unit sheet
export function rankSheet(source, cell, rank) {
    const look = LOOKS[rank];
    if (!look) return source;
    return remember(source, 'rank:' + rank + ':' + cell, () => {
        const { w, h } = srcSize(source);
        const out = make(w, h);
        const og = out.getContext('2d');
        og.imageSmoothingEnabled = false;
        for (let cy = 0; cy + cell <= h; cy += cell) {
            for (let cx = 0; cx + cell <= w; cx += cell) {
                const raw = make(cell, cell);
                const rg = raw.getContext('2d', { willReadFrequently: true });
                rg.drawImage(source, cx, cy, cell, cell, 0, 0, cell, cell);
                const b = bounds(rg, cell);
                if (!b) continue;

                const body = make(cell, cell);          // recoloured sprite
                const bg = body.getContext('2d');
                bg.filter = look.body;
                bg.drawImage(raw, 0, 0);
                bg.filter = 'none';

                const rim = silhouette(raw, cell, look.rim);
                const comp = make(cell, cell);
                const g = comp.getContext('2d');
                for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(rim, dx, dy);
                g.drawImage(body, 0, 0);
                look.decorate(g, b, cell);
                og.drawImage(comp, cx, cy);
            }
        }
        return out;
    });
}