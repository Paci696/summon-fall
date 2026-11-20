// Minimap.js - redesigned minimap: framed like the rest of the HUD, pulsing statue / nests, diamond mines and a
// glowing camera box. Same API as before (contains, toWorld, dot, dotWorld, draw), so nothing else needs to change.
import { MINI_COLORS, TILE } from './GameMap.js';

const GOLD = '#ffcf5a';

export class Minimap {
    constructor(map, camera, x, y, w, h) {
        this.map = map;
        this.camera = camera;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        // One pixel per tile, drawn once and scaled up when shown
        this.canvas = document.createElement('canvas');
        this.canvas.width = map.cols;
        this.canvas.height = map.rows;
        const c = this.canvas.getContext('2d');
        for (let ty = 0; ty < map.rows; ty++) {
            for (let tx = 0; tx < map.cols; tx++) {
                c.fillStyle = MINI_COLORS[map.tiles[ty][tx]];
                c.fillRect(tx, ty, 1, 1);
            }
        }
    }

    contains(px, py) {
        return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
    }

    toWorld(px, py) {
        return {
            x: ((px - this.x) / this.w) * this.map.widthPx,
            y: ((py - this.y) / this.h) * this.map.heightPx,
        };
    }

    // a marker on a tile: kind 'base' | 'mine' | 'nest' (colour decides the look)
    dot(ctx, tile, color) {
        const px = Math.round(this.x + ((tile.tx * TILE) / this.map.widthPx) * this.w);
        const py = Math.round(this.y + ((tile.ty * TILE) / this.map.heightPx) * this.h);
        const t = performance.now() / 1000;
        ctx.save();
        if (color === '#ffd84a') {                                   // mine: gold diamond
            ctx.fillStyle = '#05040f'; ctx.fillRect(px - 3, py - 1, 7, 3); ctx.fillRect(px - 1, py - 3, 3, 7);
            ctx.fillStyle = color; ctx.fillRect(px - 2, py, 5, 1); ctx.fillRect(px, py - 2, 1, 5); ctx.fillRect(px - 1, py - 1, 3, 3);
        } else if (color === '#ff5a5a') {                            // nest: pulsing red ring
            ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 3 + px); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 5, 0, 6.3); ctx.fill();
            ctx.globalAlpha = 1; ctx.fillStyle = '#05040f'; ctx.fillRect(px - 2, py - 2, 5, 5); ctx.fillStyle = color; ctx.fillRect(px - 1, py - 1, 3, 3);
        } else {                                                     // statue: blue beacon
            ctx.globalAlpha = 0.3 + 0.25 * Math.sin(t * 2.5); ctx.fillStyle = '#6fa0ff'; ctx.beginPath(); ctx.arc(px, py, 7, 0, 6.3); ctx.fill();
            ctx.globalAlpha = 1; ctx.fillStyle = '#05040f'; ctx.fillRect(px - 3, py - 3, 7, 7); ctx.fillStyle = '#6fa0ff'; ctx.fillRect(px - 2, py - 2, 5, 5); ctx.fillStyle = '#fff'; ctx.fillRect(px - 1, py - 1, 2, 2);
        }
        ctx.restore();
    }

    // a moving unit (the game passes green for your army, red for monsters)
    dotWorld(ctx, wx, wy, color) {
        const px = Math.round(this.x + (wx / this.map.widthPx) * this.w);
        const py = Math.round(this.y + (wy / this.map.heightPx) * this.h);
        ctx.fillStyle = 'rgba(5,4,15,.75)';
        ctx.fillRect(px - 1, py - 1, 4, 4);
        ctx.fillStyle = color;
        ctx.fillRect(px, py, 2, 2);
    }

    draw(ctx) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        // backing plate (shows around the map like a bezel)
        ctx.fillStyle = 'rgba(10,8,26,.92)';
        ctx.fillRect(this.x - 4, this.y - 4, this.w + 8, this.h + 8);
        ctx.drawImage(this.canvas, this.x, this.y, this.w, this.h);
        // soft inner vignette so the edges feel framed
        const vg = ctx.createRadialGradient(this.x + this.w / 2, this.y + this.h / 2, this.h * 0.4, this.x + this.w / 2, this.y + this.h / 2, this.w * 0.62);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,4,20,.45)');
        ctx.fillStyle = vg; ctx.fillRect(this.x, this.y, this.w, this.h);

        this.dot(ctx, this.map.playerBase, '#6fa0ff');
        this.map.mines.forEach((m) => this.dot(ctx, m, '#ffd84a'));
        this.map.nests.forEach((n) => this.dot(ctx, n, '#ff5a5a'));

        // camera box (glowing gold)
        const vx = this.x + (this.camera.x / this.map.widthPx) * this.w;
        const vy = this.y + (this.camera.y / this.map.heightPx) * this.h;
        const vw = (this.camera.viewW / this.map.widthPx) * this.w;
        const vh = (this.camera.viewH / this.map.heightPx) * this.h;
        ctx.strokeStyle = 'rgba(255,207,90,.35)'; ctx.lineWidth = 3;
        ctx.strokeRect(Math.round(vx) + 0.5, Math.round(vy) + 0.5, Math.round(vw), Math.round(vh));
        ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(vx) + 0.5, Math.round(vy) + 0.5, Math.round(vw), Math.round(vh));

        // frame: dark line, gold line, corner brackets and a small label tab
        ctx.strokeStyle = '#05040f'; ctx.lineWidth = 1; ctx.strokeRect(this.x - 0.5, this.y - 0.5, this.w + 1, this.h + 1);
        ctx.strokeStyle = '#34345a'; ctx.strokeRect(this.x - 3.5, this.y - 3.5, this.w + 7, this.h + 7);
        ctx.fillStyle = GOLD;
        const x0 = this.x - 4, y0 = this.y - 4, x1 = this.x + this.w + 4, y1 = this.y + this.h + 4;
        for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
            ctx.fillRect(sx > 0 ? cx : cx - 6, sy > 0 ? cy : cy - 1, 6, 2);
            ctx.fillRect(sx > 0 ? cx : cx - 1, sy > 0 ? cy : cy - 6, 2, 6);
        }
        ctx.fillStyle = 'rgba(10,8,26,.8)'; ctx.fillRect(this.x + 2, this.y + 2, 22, 9);
        ctx.fillStyle = GOLD; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText('MAP', this.x + 13, this.y + 9);
        ctx.restore();
    }
}