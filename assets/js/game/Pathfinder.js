import { TILE } from './GameMap.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export class Pathfinder {
    constructor(map) {
        this.map = map;
    }

    lineClear(x0, y0, x1, y1) {
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8);
        for (let i = 1; i <= n; i++) {
            const t = i / n;
            const x = x0 + (x1 - x0) * t;
            const y = y0 + (y1 - y0) * t;
            if (this.map.isBlocked(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
        }
        return true;
    }

    nearestFree(tx, ty) {
        const map = this.map;
        tx = Math.max(0, Math.min(map.cols - 1, tx));
        ty = Math.max(0, Math.min(map.rows - 1, ty));
        if (!map.isBlocked(tx, ty)) return [tx, ty];
        for (let r = 1; r <= 8; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    if (!map.isBlocked(tx + dx, ty + dy)) return [tx + dx, ty + dy];
                }
            }
        }
        return [tx, ty];
    }

    freePoint(x, y) {
        const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
        if (!this.map.isBlocked(tx, ty)) return { x, y };
        const [fx, fy] = this.nearestFree(tx, ty);
        return { x: fx * TILE + TILE / 2, y: fy * TILE + TILE / 2 };
    }

    // Returns a list of {x, y} waypoints, or null when the goal can't be reached.
    findPath(x0, y0, x1, y1) {
        const map = this.map, cols = map.cols, size = cols * map.rows;
        const [sx, sy] = this.nearestFree(Math.floor(x0 / TILE), Math.floor(y0 / TILE));
        const [gx, gy] = this.nearestFree(Math.floor(x1 / TILE), Math.floor(y1 / TILE));
        const start = sy * cols + sx, goal = gy * cols + gx;
        if (start === goal) return [{ x: x1, y: y1 }];

        const g = new Float32Array(size).fill(Infinity);
        const came = new Int32Array(size).fill(-1);
        const closed = new Uint8Array(size);
        const heap = [];
        const push = (f, i) => {
            heap.push([f, i]);
            let c = heap.length - 1;
            while (c > 0) {
                const p = (c - 1) >> 1;
                if (heap[p][0] <= heap[c][0]) break;
                [heap[p], heap[c]] = [heap[c], heap[p]];
                c = p;
            }
        };
        const pop = () => {
            const top = heap[0];
            const last = heap.pop();
            if (heap.length) {
                heap[0] = last;
                let p = 0;
                for (;;) {
                    const l = p * 2 + 1, r = l + 1;
                    let m = p;
                    if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
                    if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
                    if (m === p) break;
                    [heap[p], heap[m]] = [heap[m], heap[p]];
                    p = m;
                }
            }
            return top;
        };
        const h = (tx, ty) => {
            const dx = Math.abs(tx - gx), dy = Math.abs(ty - gy);
            return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
        };

        g[start] = 0;
        push(0, start);
        while (heap.length) {
            const i = pop()[1];
            if (closed[i]) continue;
            closed[i] = 1;
            if (i === goal) break;
            const cx = i % cols, cy = (i / cols) | 0;
            for (const [dx, dy] of DIRS) {
                const nx = cx + dx, ny = cy + dy;
                if (map.isBlocked(nx, ny)) continue;
                if (dx && dy && (map.isBlocked(cx + dx, cy) || map.isBlocked(cx, cy + dy))) continue;
                const ni = ny * cols + nx;
                if (closed[ni]) continue;
                const ng = g[i] + (dx && dy ? Math.SQRT2 : 1);
                if (ng < g[ni]) {
                    g[ni] = ng;
                    came[ni] = i;
                    push(ng + h(nx, ny), ni);
                }
            }
        }
        if (came[goal] === -1) return null;

        const pts = [];
        for (let i = goal; i !== start; i = came[i]) {
            pts.push({ x: (i % cols) * TILE + TILE / 2, y: ((i / cols) | 0) * TILE + TILE / 2 });
        }
        pts.reverse();
        const path = this.smooth(pts, x0, y0);
        if (!map.isBlocked(Math.floor(x1 / TILE), Math.floor(y1 / TILE))) {
            path[path.length - 1] = { x: x1, y: y1 };
        }
        return path;
    }

    // Removes unnecessary waypoints so units walk in straight lines where they can
    smooth(points, startX, startY) {
        const out = [];
        let ax = startX, ay = startY, i = 0;
        while (i < points.length) {
            let j = points.length - 1;
            while (j > i && !this.lineClear(ax, ay, points[j].x, points[j].y)) j--;
            out.push(points[j]);
            ax = points[j].x;
            ay = points[j].y;
            i = j + 1;
        }
        return out;
    }
}