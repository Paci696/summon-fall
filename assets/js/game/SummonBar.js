const BTN_W = 74;
const BTN_H = 32;
const GAP = 3;
const LEFT = 8;
const PER_ROW = 6;
const TIER_COLORS = ['#ffcf5a', '#6fd0ff', '#ff80ff']; // base, elite, godly

export class SummonBar {
    constructor(game) {
        this.game = game;
        const baseY = game.camera.viewH - BTN_H - 8;
        this.buttons = game.summonable.map((stats, i) => {
            const row = Math.floor(i / PER_ROW);
            const col = i % PER_ROW;
            return { stats, x: LEFT + col * (BTN_W + GAP), y: baseY - row * (BTN_H + GAP), w: BTN_W, h: BTN_H };
        });
        // top edge of the bar, used to place the meteor button above it
        this.top = this.buttons.length ? Math.min(...this.buttons.map((b) => b.y)) : baseY;
    }

    hit(b, px, py) {
        return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
    }

    contains(px, py) {
        return this.buttons.some((b) => this.hit(b, px, py));
    }

    click(px, py) {
        const b = this.buttons.find((btn) => this.hit(btn, px, py));
        if (b) this.game.trySummon(b.stats);
        return !!b;
    }

    activate(index) {
        const b = this.buttons[index];
        if (b) this.game.trySummon(b.stats);
    }

    // Shrinks the font (then trims the text) until it fits the button.
    fitText(ctx, text, maxW) {
        let size = 9;
        ctx.font = size + 'px monospace';
        while (size > 6 && ctx.measureText(text).width > maxW) { size--; ctx.font = size + 'px monospace'; }
        while (text.length > 2 && ctx.measureText(text).width > maxW) text = text.slice(0, -1);
        return text;
    }

    draw(ctx) {
        const g = this.game;
        const frac = g.summonCooldownMax > 0 ? g.summonCooldown / g.summonCooldownMax : 0;
        ctx.textAlign = 'left';
        this.buttons.forEach((b, i) => {
            const isMiner = b.stats.class_type === 'miner';
            const maxed = isMiner && g.minerCount() >= g.maxMiners;
            const afford = g.gold >= b.stats.cost && !maxed;
            ctx.fillStyle = 'rgba(15, 15, 35, 0.85)';
            ctx.fillRect(b.x, b.y, b.w, b.h);
            if (frac > 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
                ctx.fillRect(b.x, b.y + b.h * (1 - frac), b.w, b.h * frac);
            }
            ctx.strokeStyle = afford ? (TIER_COLORS[b.stats.unit_tier] || TIER_COLORS[0]) : '#555';
            ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);

            const name = this.fitText(ctx, (i === 9 ? 0 : i + 1) + ' ' + b.stats.name, b.w - 6);
            ctx.fillStyle = afford ? '#fff' : '#888';
            ctx.fillText(name, b.x + 4, b.y + 13);
            const costText = isMiner ? b.stats.cost + 'g  ' + g.minerCount() + '/' + g.maxMiners : b.stats.cost + ' gold';
            const cost = this.fitText(ctx, costText, b.w - 6);
            ctx.fillStyle = afford ? '#ffd84a' : '#777';
            ctx.fillText(cost, b.x + 4, b.y + 26);
        });
    }

    // Stat tooltip for the button under the mouse.
    drawTooltip(ctx) {
        const m = this.game.input.mouse;
        if (!m.inside) return;
        const b = this.buttons.find((btn) => this.hit(btn, m.x, m.y));
        if (!b) return;
        const s = b.stats;
        const lines = [
            s.name + ' (' + s.role + ')',
            'HP ' + s.hp + '   ' + (s.class_type === 'healer' ? 'HEAL ' : 'DMG ') + s.damage,
            'Speed ' + s.speed + '   Range ' + s.attack_range,
        ];
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 10;
        const h = lines.length * 11 + 6;
        const x = Math.min(b.x, 480 - w);
        const y = b.y - h - 4;
        ctx.fillStyle = 'rgba(10, 10, 25, 0.95)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ffcf5a';
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.fillStyle = '#ffcf5a';
        ctx.fillText(lines[0], x + 5, y + 12);
        ctx.fillStyle = '#fff';
        ctx.fillText(lines[1], x + 5, y + 23);
        ctx.fillText(lines[2], x + 5, y + 34);
    }
}