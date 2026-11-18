const BTN_H = 30;
const GAP = 3;
const STANCES = [
    { key: 'attack', label: 'Z Attack' },
    { key: 'defend', label: 'X Defend' },
    { key: 'hold',   label: 'C Hold' },
];

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
        const active = this.game.activeStance();
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        for (const b of this.buttons) {
            ctx.fillStyle = b.key === active ? 'rgba(60, 90, 160, 0.9)' : 'rgba(15, 15, 35, 0.85)';
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = b.key === active ? '#6fa0ff' : '#555';
            ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
            ctx.fillStyle = '#fff';
            ctx.fillText(b.label, b.x + b.w / 2, b.y + 19);
        }
        const n = this.game.selected.size;
        if (n > 0) {
            const mm = this.game.minimap;
            ctx.fillStyle = '#6fff6f';
            ctx.fillText('Selected: ' + n, mm.x + mm.w / 2, this.buttons[0].y - 4);
        }
    }
}