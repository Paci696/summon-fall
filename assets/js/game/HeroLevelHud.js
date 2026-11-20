// HeroLevelHud.js - in-game hero level bar (top centre), styled like the other HUD panels.
// Hex level badge + slim segmented XP bar. The bar fills live as the run earns XP (same formula as HeroLevel.php);
// on level-up the badge pulses, the bar flashes and sparks fly.
const MAX = 100, TAU = Math.PI * 2;
const need = (lv) => 60 + 25 * lv;
function fromXp(xp) {
    let level = 1;
    while (level < MAX && xp >= need(level)) { xp -= need(level); level++; }
    return { level, xp: level >= MAX ? 0 : xp, need: level >= MAX ? 0 : need(level) };
}
const GOLD = '#ffcf5a';

function hex(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = TAU / 6 * i - TAU / 4; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath();
}

export class HeroLevelHud {
    constructor(cfg) {
        this.base = Number(cfg.heroXp) || 0;
        this.name = String(cfg.heroName || 'Hero');
        this.startLevel = fromXp(this.base).level;
        this.level = this.startLevel;
        this.flash = 0;
        this.shown = 0;
        this.sparks = [];
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
            this.level = info.level; this.flash = 2; this.shown = 0;
            game.showBanner('LEVEL UP! ' + this.name.toUpperCase() + ' LV ' + info.level);
            for (let i = 0; i < 22; i++) this.sparks.push({ a: Math.random() * TAU, v: 30 + Math.random() * 60, t: 0.7 + Math.random() * 0.5 });
        }
        this.flash = Math.max(0, this.flash - dt);
        const target = info.need > 0 ? info.xp / info.need : 1;
        this.shown += (target - this.shown) * Math.min(1, dt * 6);

        const w = 216, h = 36, x = Math.round(viewW / 2 - w / 2), y = 6, f = Math.min(1, this.flash);
        const cx = x + 20, cy = y + h / 2;
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        // panel body
        const bg = ctx.createLinearGradient(0, y, 0, y + h);
        bg.addColorStop(0, 'rgba(30,26,62,.92)'); bg.addColorStop(1, 'rgba(10,8,26,.92)');
        ctx.fillStyle = bg; ctx.fillRect(x + 12, y + 4, w - 12, h - 8);
        ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x + 12, y + 5, w - 12, 2);
        ctx.strokeStyle = f > 0 ? '#fff' : '#34345a'; ctx.lineWidth = 1; ctx.strokeRect(x + 12.5, y + 4.5, w - 13, h - 9);
        ctx.fillStyle = '#07061a'; ctx.fillRect(x + 14, y + h - 4, w - 12, 2);
        // hex badge
        ctx.save();
        ctx.translate(0, 0);
        const pulse = 1 + f * 0.18 * Math.sin(now / 50);
        hex(ctx, cx + 1, cy + 2, 17 * pulse); ctx.fillStyle = '#07061a'; ctx.fill();
        hex(ctx, cx, cy, 17 * pulse);
        const hg = ctx.createLinearGradient(0, cy - 17, 0, cy + 17); hg.addColorStop(0, '#ffe08a'); hg.addColorStop(1, '#c0841c');
        ctx.fillStyle = hg; ctx.fill();
        hex(ctx, cx, cy, 13.5 * pulse); ctx.fillStyle = '#1b1432'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,207,90,.5)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9a8ad0'; ctx.font = 'bold 7px monospace'; ctx.fillText('LV', cx, cy - 4);
        ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (info.level > 99 ? 11 : 14) + 'px monospace'; ctx.fillText(String(info.level), cx, cy + 9);
        // name + xp text
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e8e8f0'; ctx.font = 'bold 10px monospace';
        ctx.fillText(this.name.toUpperCase().slice(0, 16), x + 42, y + 15);
        ctx.textAlign = 'right'; ctx.fillStyle = '#8a8cc0'; ctx.font = '9px monospace';
        ctx.fillText(info.need > 0 ? info.xp + ' / ' + info.need + ' XP' : 'MAX LEVEL', x + w - 8, y + 15);
        // xp bar
        const bx = x + 42, by = y + 20, bw = w - 50, bh = 7;
        ctx.fillStyle = '#05040f'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = '#16142e'; ctx.fillRect(bx, by, bw, bh);
        const fw = Math.round(bw * Math.min(1, this.shown));
        if (fw > 0) {
            const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#8a4cff'); g.addColorStop(0.6, '#d07aff'); g.addColorStop(1, GOLD);
            ctx.fillStyle = g; ctx.fillRect(bx, by, fw, bh);
            ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(bx, by, fw, 2);
            const gl = ((now / 900) % 1.6 - 0.3) * bw;                          // moving glint
            if (gl > 0 && gl < fw) { ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(bx + Math.round(gl), by, 4, bh); }
        }
        ctx.fillStyle = 'rgba(5,4,15,.7)';                                        // segment ticks (every 10%)
        for (let i = 1; i < 10; i++) ctx.fillRect(bx + Math.round(bw * i / 10), by, 1, bh);
        if (f > 0) { ctx.globalAlpha = f * 0.5; ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh); ctx.globalAlpha = 1; }
        // sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i]; s.t -= dt;
            if (s.t <= 0) { this.sparks.splice(i, 1); continue; }
            ctx.globalAlpha = Math.min(1, s.t * 2); ctx.fillStyle = i % 2 ? GOLD : '#fff';
            const d = (1.2 - s.t) * s.v; ctx.fillRect(Math.round(cx + Math.cos(s.a) * d), Math.round(cy + Math.sin(s.a) * d), 2, 2);
        }
        ctx.globalAlpha = 1;
        // levels gained this run: small chip under the panel
        const gained = this.level - this.startLevel;
        if (gained > 0) {
            const t = '+' + gained + ' LV THIS RUN', tw = t.length * 5.6 + 12;
            ctx.fillStyle = 'rgba(10,8,26,.85)'; ctx.fillRect(x + w / 2 - tw / 2 + 6, y + h + 2, tw, 13);
            ctx.strokeStyle = '#2a6a3a'; ctx.strokeRect(x + w / 2 - tw / 2 + 6.5, y + h + 2.5, tw - 1, 12);
            ctx.fillStyle = '#6fff9a'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
            ctx.fillText(t, x + w / 2 + 6, y + h + 12);
        }
        ctx.restore();
    }
}

// One-call entry point (state is created on first draw, no constructor edit needed)
export function drawHeroLevelHud(ctx, game, viewW) {
    if (!game._heroHud) game._heroHud = new HeroLevelHud(window.GAME_CONFIG || {});
    game._heroHud.draw(ctx, game, viewW);
}