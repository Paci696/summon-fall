import { MINI_COLORS, TILE } from './GameMap.js';

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

    dot(ctx, tile, color) {
        const px = this.x + ((tile.tx * TILE) / this.map.widthPx) * this.w;
        const py = this.y + ((tile.ty * TILE) / this.map.heightPx) * this.h;
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
        
    }
    dotWorld(ctx, wx, wy, color) {
        const px = this.x + (wx / this.map.widthPx) * this.w;
        const py = this.y + (wy / this.map.heightPx) * this.h;
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
    }
    

    draw(ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.canvas, this.x, this.y, this.w, this.h);

        this.dot(ctx, this.map.playerBase, '#6fa0ff');
        this.map.mines.forEach((m) => this.dot(ctx, m, '#ffd84a'));
        this.map.nests.forEach((n) => this.dot(ctx, n, '#ff5a5a'));

        const vx = this.x + (this.camera.x / this.map.widthPx) * this.w;
        const vy = this.y + (this.camera.y / this.map.heightPx) * this.h;
        const vw = (this.camera.viewW / this.map.widthPx) * this.w;
        const vh = (this.camera.viewH / this.map.heightPx) * this.h;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(vx) + 0.5, Math.round(vy) + 0.5, Math.round(vw), Math.round(vh));

        ctx.strokeStyle = '#000';
        ctx.strokeRect(this.x - 0.5, this.y - 0.5, this.w + 1, this.h + 1);
    }
}