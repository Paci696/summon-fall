// StanceBar.js - redesigned stance buttons (Z / X / C) with icons and a glowing active state. Same API as before.
const BTN_H = 30;
const GAP = 3;
const STANCES = [
    { key: 'attack', label: 'ATTACK', k: 'Z', col: '#ff7a6a' },
    { key: 'defend', label: 'DEFEND', k: 'X', col: '#6fa8ff' },
    { key: 'hold',   label: 'HOLD',   k: 'C', col: '#ffcf5a' },
];

function icon(ctx, key, cx, cy, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(0.72, 0.72); cx = 0; cy = 0; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
    if (key === 'attack') {                                  // crossed swords
        ctx.beginPath(); ctx.moveTo(cx - 6, cy + 6); ctx.lineTo(cx + 6, cy - 6); ctx.moveTo(cx + 6, cy + 6); ctx.lineTo(cx - 6, cy - 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 8, cy + 3); ctx.lineTo(cx - 4, cy + 7); ctx.moveTo(cx + 8, cy + 3); ctx.lineTo(cx + 4, cy + 7); ctx.stroke();
    } else if (key === 'defend') {                           // shield
        ctx.beginPath(); ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy - 6); ctx.lineTo(cx + 6, cy + 1); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 6, cy + 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(cx - 1, cy - 4, 2, 9);
    } else {                                                 // hold: flag planted in the ground
        ctx.beginPath(); ctx.moveTo(cx - 3, cy + 7); ctx.lineTo(cx - 3, cy - 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 3, cy - 7); ctx.lineTo(cx + 7, cy - 3); ctx.lineTo(cx - 3, cy + 1); ctx.closePath(); ctx.fill();
        ctx.fillRect(cx - 7, cy + 6, 9, 2);
    }
    ctx.restore();
}

export class StanceBar {
    constructor(game) {
        this.game = game;
        const mm = game.minimap;
        const w = Math.floor((mm.w - GAP * 2) / 3);
        const y = mm.y - BTN_H - 4;
        this.buttons = STANCES.map((s, i) => ({ ...s, x: mm.x + i * (w + GAP), y, w, h: BTN_H }));
    }

    hit(b, px, py) {
        return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
    }

    contains(px, py) {
        return this.buttons.some((b) => this.hit(b, px, py));
    }

    click(px, py) {
        const b = this.buttons.find((btn) => this.hit(btn, px, py));
        if (b) this.game.setStance(b.key);
        return !!b;
    }

    draw(ctx) {
        const active = this.game.activeStance(), now = performance.now() / 1000;
        ctx.save();
        ctx.textAlign = 'center';
        for (const b of this.buttons) {
            const on = b.key === active;
            const bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
            bg.addColorStop(0, on ? 'rgba(52,64,120,.96)' : 'rgba(30,28,56,.92)'); bg.addColorStop(1, on ? 'rgba(24,30,70,.96)' : 'rgba(10,8,24,.92)');
            ctx.fillStyle = bg; ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 2);
            ctx.strokeStyle = on ? b.col : '#3a3a5e'; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
            if (on) { ctx.globalAlpha = 0.6 + 0.3 * Math.sin(now * 4); ctx.fillStyle = b.col; ctx.fillRect(b.x + 1, b.y + b.h - 3, b.w - 2, 2); ctx.globalAlpha = 1; }
            icon(ctx, b.key, b.x + b.w / 2 - 4, b.y + 9, on ? b.col : '#8a8cb0');
            ctx.fillStyle = on ? b.col : '#3a3a5e'; ctx.fillRect(b.x + b.w - 12, b.y + 3, 9, 10);
            ctx.fillStyle = on ? '#10101e' : '#9a9cc0'; ctx.font = 'bold 8px monospace'; ctx.fillText(b.k, b.x + b.w - 7.5, b.y + 11);
            ctx.fillStyle = on ? '#fff' : '#8a8cb0'; ctx.font = 'bold 8px monospace'; ctx.fillText(b.label, b.x + b.w / 2, b.y + 27);
        }
        const n = this.game.selected.size;
        if (n > 0) {
            const mm = this.game.minimap;
            ctx.fillStyle = 'rgba(10,8,24,.85)'; ctx.fillRect(mm.x + mm.w / 2 - 38, this.buttons[0].y - 16, 76, 13);
            ctx.fillStyle = '#6fff9a'; ctx.font = 'bold 9px monospace';
            ctx.fillText('SELECTED ' + n, mm.x + mm.w / 2, this.buttons[0].y - 6);
        }
        ctx.restore();
    }
}