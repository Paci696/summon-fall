// SummonBar.js - redesigned summon bar: every button shows the unit's own art (base / Elite / Godly),
// a hotkey badge, the cost with a coin, a tier-coloured frame and a cooldown sweep. Same API as before.
import { getRankFrames } from './EliteArt.js';

const BTN_W = 96;
const BTN_H = 40;
const GAP = 3;
const LEFT = 8;
const PER_ROW = 6;
const TIER_COLORS = ['#ffcf5a', '#6fd0ff', '#ff80ff']; // base, elite, godly
const TIER_NAMES = ['', 'ELITE', 'GODLY'];

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

    // Shrinks the font (then trims the text) until it fits.
    fitText(ctx, text, maxW, start = 10, bold = false) {
        let size = start;
        const f = (s) => (bold ? 'bold ' : '') + s + 'px monospace';
        ctx.font = f(size);
        while (size > 6 && ctx.measureText(text).width > maxW) { size--; ctx.font = f(size); }
        while (text.length > 2 && ctx.measureText(text).width > maxW) text = text.slice(0, -1);
        return text;
    }

    icon(ctx, b, x, y, s) {
        const key = String(b.stats.sprite_key), tier = b.stats.unit_tier || 0;
        const f = getRankFrames(key, tier);
        if (!f) return false;
        const list = f.index.idle, i = Math.floor(performance.now() / 260 + b.x) % list.length;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(f.canvas, list[i] * f.cell + 3, 1, f.cell - 6, f.cell - 3, x, y, s, Math.round(s * (f.cell - 3) / (f.cell - 6)));
        return true;
    }

    draw(ctx) {
        const g = this.game, now = performance.now() / 1000;
        const frac = g.summonCooldownMax > 0 ? g.summonCooldown / g.summonCooldownMax : 0;
        ctx.save();
        ctx.textAlign = 'left';
        this.buttons.forEach((b, i) => {
            const tier = b.stats.unit_tier || 0, col = TIER_COLORS[tier] || TIER_COLORS[0];
            const isMiner = b.stats.class_type === 'miner';
            const maxed = isMiner && g.minerCount() >= g.maxMiners;
            const afford = g.gold >= b.stats.cost && !maxed;
            const { x, y, w, h } = b;
            // card
            const bg = ctx.createLinearGradient(0, y, 0, y + h);
            bg.addColorStop(0, tier === 2 ? 'rgba(62,28,70,.94)' : tier === 1 ? 'rgba(20,44,70,.94)' : 'rgba(34,30,62,.94)'); bg.addColorStop(1, 'rgba(10,8,24,.94)');
            ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
            ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x + 1, y + 1, w - 2, 2);
            // icon well
            ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + 3, y + 3, h - 6, h - 6);
            ctx.globalAlpha = afford ? 1 : 0.45;
            this.icon(ctx, b, x + 4, y + 3, h - 8);
            ctx.globalAlpha = 1;
            // hotkey badge
            ctx.fillStyle = afford ? col : '#4a4a62'; ctx.fillRect(x + 3, y + 3, 11, 11);
            ctx.fillStyle = '#10101e'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillText(String(i === 9 ? 0 : i + 1), x + 8.5, y + 12); ctx.textAlign = 'left';
            // name + cost
            const tx = x + h - 1, tw = w - h - 2;
            ctx.fillStyle = afford ? '#fff' : '#8a8aa0';
            ctx.fillText(this.fitText(ctx, b.stats.name.replace(/^(Elite|Godly) /, ''), tw, 10, true), tx, y + 15);
            if (tier > 0) { ctx.fillStyle = col; ctx.font = 'bold 7px monospace'; ctx.fillText(TIER_NAMES[tier], tx, y + 24); }
            const costText = isMiner ? b.stats.cost + '  ' + g.minerCount() + '/' + g.maxMiners : String(b.stats.cost);
            ctx.fillStyle = afford ? '#ffd84a' : '#7a5a5a';
            ctx.beginPath(); ctx.arc(tx + 4, y + 33, 3.5, 0, 6.3); ctx.fill();
            ctx.fillStyle = afford ? '#ffe98a' : '#9a7a7a'; ctx.font = 'bold 10px monospace'; ctx.fillText(this.fitText(ctx, costText, tw - 12, 10, true), tx + 11, y + 37);
            // cooldown sweep
            if (frac > 0) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y + h * (1 - frac), w, h * frac); }
            // frame
            ctx.lineWidth = 1;
            ctx.strokeStyle = afford ? col : '#4a4a62'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            if (afford && tier > 0) {                       // glow line
                ctx.globalAlpha = tier === 2 ? 0.5 + 0.4 * Math.sin(now * 3 + i) : 0.6; ctx.fillStyle = col; ctx.fillRect(x + 1, y + h - 2, w - 2, 1); ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.globalAlpha = 1;
            }
        });
        ctx.restore();
    }

    // Stat tooltip for the button under the mouse.
    drawTooltip(ctx) {
        const m = this.game.input.mouse;
        if (!m.inside) return;
        const b = this.buttons.find((btn) => this.hit(btn, m.x, m.y));
        if (!b) return;
        const s = b.stats, tier = s.unit_tier || 0, col = TIER_COLORS[tier] || TIER_COLORS[0];
        const lines = [
            s.name + ' (' + s.role + ')',
            'HP ' + s.hp + '   ' + (s.class_type === 'healer' ? 'HEAL ' : 'DMG ') + s.damage,
            'Speed ' + s.speed + '   Range ' + s.attack_range,
        ];
        ctx.save();
        ctx.font = '10px monospace'; ctx.textAlign = 'left';
        const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14, h = lines.length * 13 + 8;
        const x = Math.min(b.x, 620 - w), y = b.y - h - 4;
        ctx.fillStyle = 'rgba(10,10,25,.96)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = col; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.fillStyle = col; ctx.fillRect(x, y, 3, h);
        ctx.fillStyle = col; ctx.fillText(lines[0], x + 8, y + 14);
        ctx.fillStyle = '#fff'; ctx.fillText(lines[1], x + 8, y + 27); ctx.fillText(lines[2], x + 8, y + 40);
        ctx.restore();
    }
}