import { TILE } from './GameMap.js';
import { getArt } from './art.js';

export class GoldMine {
    constructor(tile, gold) {
        this.x = tile.tx * TILE + TILE / 2;
        this.y = tile.ty * TILE + TILE / 2;
        this.gold = gold;
        this.workX = this.x;
        this.workY = this.y + 30; // where miners stand
    }

    take(amount) {
        const taken = Math.min(amount, this.gold);
        this.gold -= taken;
        return taken;
    }

    draw(ctx, camera) {
        const s = camera.worldToScreen(this.x, this.y);
        if (s.x < -40 || s.x > camera.viewW + 40 || s.y < -40 || s.y > camera.viewH + 40) return;
        const art = getArt();
        const img = art.mine[this.gold > 0 ? 0 : 1];     // full cave, or the grey empty one
        ctx.drawImage(img, Math.round(s.x - 24), Math.round(s.y - 36));
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Number.isFinite(this.gold) ? String(this.gold) : '\u221E', s.x, s.y - 40);   // infinity sign
    }
}