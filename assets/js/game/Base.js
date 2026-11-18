import { Entity } from './Entity.js';
import { TILE } from './GameMap.js';
import { getArt } from './art.js';

export class Base extends Entity {
    constructor(tile, hp) {
        super(tile.tx * TILE + TILE / 2, tile.ty * TILE + TILE / 2, hp);
        this.radius = 32;
        this.workX = this.x;
        this.workY = this.y + 60; // where miners stand to deposit gold
    }

    draw(ctx, camera) {
        const s = camera.worldToScreen(this.x, this.y);
        if (s.x < -90 || s.x > camera.viewW + 90 || s.y < -90 || s.y > camera.viewH + 110) return;
        const art = getArt();
        const t = performance.now();
        const bob = Math.sin(t / 450) * 2;
        const x = Math.round(s.x - 32);
        const y = Math.round(s.y - 58);

        ctx.drawImage(art.statue, x, y);
        ctx.save();                                   // pulsing glow around the crystal
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t / 300);
        ctx.drawImage(art.crystalGlow, x + 32 - 36, Math.round(y + 28 + bob - 36));
        ctx.restore();
        ctx.drawImage(art.crystal, x + 24, Math.round(y + 14 + bob));

        this.drawHpBar(ctx, s.x, s.y - 56, 48, true);
    }
}