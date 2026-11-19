// HeroLevelHud.js - in-game hero level bar (top centre). Shows the hero's level, and the XP bar fills live
// as this run earns XP (same formula as HeroLevel.php). When the bar fills, the level goes up with a flash + banner.
const MAX = 100;
const need = (lv) => 60 + 25 * lv;
function fromXp(xp) {
    let level = 1;
    while (level < MAX && xp >= need(level)) { xp -= need(level); level++; }
    return { level, xp: level >= MAX ? 0 : xp, need: level >= MAX ? 0 : need(level) };
}

export class HeroLevelHud {
    constructor(cfg) {
        this.base = Number(cfg.heroXp) || 0;
        this.name = String(cfg.heroName || 'Hero');
        this.startLevel = fromXp(this.base).level;
        this.level = this.startLevel;
        this.flash = 0;
        this.shown = 0;                    // smoothed bar fill 0..1
        this.last = performance.now();
    }

    runXp(game) {
        const wave = game.spawner ? game.spawner.wave : 0;
        return Math.max(0, Math.floor(game.score / 20) + game.kills * 3 + wave * 25);
    }

    draw(ctx, game, viewW) {
        const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
        const info = fromXp(this.base + (game.spawner ? this.runXp(game) : 0));
        if (info.level > this.level) {
            this.level = info.level; this.flash = 2.2;
            game.showBanner('LEVEL UP! ' + this.name.toUpperCase() + ' LV ' + info.level);
            this.shown = 0;
        }
        this.flash = Math.max(0, this.flash - dt);
        const target = info.need > 0 ? info.xp / info.need : 1;
        this.shown += (target - this.shown) * Math.min(1, dt * 6);

        const w = 190, h = 26, x = Math.round(viewW / 2 - w / 2), y = 4;
        ctx.save();
        ctx.fillStyle = 'rgba(8, 6, 20, 0.7)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = this.flash > 0 && Math.floor(this.flash * 8) % 2 ? '#ffffff' : '#ffcf5a';
        ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        // level badge
        ctx.fillStyle = '#ffcf5a'; ctx.fillRect(x + 3, y + 3, 40, 20);
        ctx.fillStyle = '#1a1424'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('LV ' + info.level, x + 23, y + 17);
        // name + bar
        ctx.textAlign = 'left'; ctx.fillStyle = '#e8e8f0'; ctx.font = '10px monospace';
        ctx.fillText(this.name.toUpperCase(), x + 49, y + 12);
        const bx = x + 49, by = y + 16, bw = w - 55;
        ctx.fillStyle = '#0b0a1c'; ctx.fillRect(bx, by, bw, 6);
        const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#b070ff'); g.addColorStop(1, '#ffcf5a');
        ctx.fillStyle = g; ctx.fillRect(bx, by, Math.round(bw * Math.min(1, this.shown)), 6);
        if (this.flash > 0) { ctx.globalAlpha = Math.min(1, this.flash) * 0.35; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); }
        ctx.restore();
        if (this.level > this.startLevel) {                // small reminder of the levels gained this run
            ctx.save(); ctx.fillStyle = '#6fff9a'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
            ctx.fillText('+' + (this.level - this.startLevel) + ' level' + (this.level - this.startLevel > 1 ? 's' : '') + ' this run', viewW / 2, y + h + 12);
            ctx.restore();
        }
    }
}

// One-call entry point: no constructor edit needed. The state is created the first time it is drawn.
export function drawHeroLevelHud(ctx, game, viewW) {
    if (!game._heroHud) game._heroHud = new HeroLevelHud(window.GAME_CONFIG || {});
    game._heroHud.draw(ctx, game, viewW);
}