// HudWidgets.js - redesigned hero panel (animated portrait, level badge, new skill icons, cooldown dials)
// and the Summon Fall meteor button. Same layout/hit areas as the old ones, so clicks keep working.
//   Game.drawHeroPanel(ctx)  -> first line:  if (drawModernHeroPanel(this, ctx)) return;
//   Game.drawMeteorHud(ctx)  -> first line:  if (drawModernMeteor(this, ctx)) return;
import { HeroUnit, HERO_KEYS } from './HeroUnit.js';
import { getHeroFrames, HeroAnimator } from './HeroAnim.js';

const TAU = Math.PI * 2;
const GOLD = '#ffcf5a';
const TYPE_COL = { dash: '#ffb070', shield: '#8fd4ff', buff: '#ffcf5a', line: '#fff0a0', area: '#ff9050', nova: '#a0e4ff', heal: '#7fff9f', shift: '#ff7a5a', raise: '#7fe08a' };
const portraits = {};

function skillIcon(ctx, type, cx, cy, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (type) {
        case 'dash':      // claw leap: arrow with speed lines
            ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(7, 0); ctx.moveTo(2, -5); ctx.lineTo(8, 0); ctx.lineTo(2, 5); ctx.stroke();
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(-3, -5); ctx.moveTo(-9, 5); ctx.lineTo(-3, 5); ctx.stroke(); break;
        case 'shield':
            ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(7, -8); ctx.lineTo(7, 1); ctx.lineTo(0, 9); ctx.lineTo(-7, 1); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-1, -6, 2, 12); ctx.fillRect(-5, -2, 10, 2); break;
        case 'buff':      // rising chevrons
            for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-7, 6 - i * 5); ctx.lineTo(0, 0 - i * 5); ctx.lineTo(7, 6 - i * 5); ctx.stroke(); } break;
        case 'line':      // bolt
            ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(-2, -2); ctx.lineTo(1, 2); ctx.lineTo(9, -7); ctx.stroke(); ctx.beginPath(); ctx.arc(9, -7, 2, 0, TAU); ctx.fill(); break;
        case 'area':      // meteor / rain
            ctx.beginPath(); ctx.arc(2, 3, 5, 0, TAU); ctx.fill(); ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(-9, -8); ctx.moveTo(-4, 3); ctx.lineTo(-10, -2); ctx.moveTo(1, -2); ctx.lineTo(-4, -9); ctx.stroke(); break;
        case 'nova':      // snowflake / howl burst
            for (let a = 0; a < 3; a++) { const r = a * 1.047; ctx.beginPath(); ctx.moveTo(-9 * Math.cos(r), -9 * Math.sin(r)); ctx.lineTo(9 * Math.cos(r), 9 * Math.sin(r)); ctx.stroke(); }
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill(); break;
        case 'heal':
            ctx.fillRect(-2, -9, 4, 18); ctx.fillRect(-9, -2, 18, 4); break;
        case 'shift':     // paw print
            ctx.beginPath(); ctx.ellipse(0, 4, 5, 4, 0, 0, TAU); ctx.fill();
            for (const [x, y] of [[-7, -2], [-2.5, -6], [2.5, -6], [7, -2]]) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); } break;
        case 'raise':     // skull
            ctx.beginPath(); ctx.arc(0, -2, 6, 0, TAU); ctx.fill(); ctx.fillRect(-4, 2, 8, 6);
            ctx.fillStyle = '#10101e'; ctx.fillRect(-4, -4, 3, 3); ctx.fillRect(1, -4, 3, 3); ctx.fillRect(-1, 3, 1, 4); ctx.fillRect(1, 3, 1, 4); break;
        default: ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke();
    }
    ctx.restore();
}

export function drawModernHeroPanel(g, ctx) {
    if (!g.heroData || g.gameOver) return true;
    const r = g.heroRect(), h = g.heroUnit, now = performance.now() / 1000;
    ctx.save();
    // frame
    const bg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    bg.addColorStop(0, 'rgba(34,28,66,.94)'); bg.addColorStop(1, 'rgba(10,8,26,.94)');
    ctx.fillStyle = bg; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, 2);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    // animated portrait (wolf form shows the wolf)
    const key = h && h.wolfT > 0 ? g.heroData.sprite_key + '_wolf' : g.heroData.sprite_key;
    if (!portraits[key]) { const f = getHeroFrames(key); portraits[key] = f ? new HeroAnimator(f) : null; }
    const pa = portraits[key];
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(r.x + 3, r.y + 3, 28, 28);
    ctx.strokeStyle = '#4a3f7a'; ctx.strokeRect(r.x + 3.5, r.y + 3.5, 27, 27);
    if (pa) {
        pa.update(16); pa.play(h && h.state === 'attacking' ? 'attack' : 'idle');
        ctx.save(); ctx.beginPath(); ctx.rect(r.x + 4, r.y + 4, 26, 26); ctx.clip();
        const c = pa.f; const list = c.index[pa.anim], i = Math.floor(pa.t / 220) % list.length;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(c.canvas, list[i] * c.cell + 6, 4, c.cell - 12, c.cell - 8, r.x + 3, r.y + 3, 28, 29);
        ctx.restore();
    }
    // name + level chip
    const lvl = g._heroHud ? g._heroHud.level : Number((window.GAME_CONFIG || {}).heroLevel) || 1;
    ctx.textAlign = 'left'; ctx.font = 'bold 10px monospace'; ctx.fillStyle = GOLD;
    ctx.fillText(g.heroData.name.toUpperCase(), r.x + 35, r.y + 12);
    ctx.fillStyle = GOLD; ctx.fillRect(r.x + r.w - 29, r.y + 4, 25, 11); ctx.fillStyle = '#10101e'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('LV' + lvl, r.x + r.w - 16.5, r.y + 12.5); ctx.textAlign = 'left';
    // hp bar
    const bx = r.x + 35, by = r.y + 18, bw = r.w - 41;
    ctx.fillStyle = '#1a0808'; ctx.fillRect(bx, by, bw, 10);
    if (h) {
        const ratio = Math.max(0, Math.min(1, h.hp / g.maxHpOf(h)));
        const hg = ctx.createLinearGradient(0, by, 0, by + 10);
        const base = ratio > 0.5 ? ['#7aef80', '#2f9a3a'] : ratio > 0.25 ? ['#f0d850', '#a08a10'] : ['#ff6a5a', '#a02020'];
        hg.addColorStop(0, base[0]); hg.addColorStop(1, base[1]);
        ctx.fillStyle = hg; ctx.fillRect(bx, by, Math.round(bw * ratio), 10);
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(bx, by, Math.round(bw * ratio), 2);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace'; ctx.fillText(Math.ceil(h.hp) + '/' + Math.ceil(g.maxHpOf(h)), bx + 2, by + 8);
        if (h.isNecro) { ctx.fillStyle = '#7fe08a'; ctx.fillText('UNDEAD ' + g.undeadCount() + '/' + h.maxUndead, bx + 46, by + 8); }
        if (h.wolfT > 0) { ctx.fillStyle = '#ffd0b0'; ctx.fillText('WOLF ' + Math.ceil(h.wolfT) + 's', bx + 46, by + 8); }
    } else {
        ctx.fillStyle = '#ff8a8a'; ctx.font = 'bold 8px monospace'; ctx.fillText('BACK IN ' + Math.ceil(g.heroRevive) + 's', bx + 2, by + 8);
    }
    ctx.strokeStyle = '#34345a'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 9);
    // skills
    const abilities = g.heroData.abilities || [];
    for (const b of g.heroButtons()) {
        const a = abilities[b.slot]; if (!a) continue;
        const live = h ? h.abilities[b.slot] : null, cd = h ? h.cd[b.slot] : 0, cdMax = live ? live.cooldownMax : a.cooldown_sec;
        const ready = !!h && cd <= 0, col = TYPE_COL[a.ability_type] || '#fff', aiming = g.heroAiming === b.slot;
        const sg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); sg.addColorStop(0, 'rgba(46,40,86,.98)'); sg.addColorStop(1, 'rgba(18,14,40,.98)');
        ctx.fillStyle = sg; ctx.fillRect(b.x, b.y, b.w, b.h);
        if (ready) { ctx.globalAlpha = 0.16 + 0.07 * Math.sin(now * 4 + b.slot); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + 17, 14, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        skillIcon(ctx, a.ability_type, b.x + b.w / 2, b.y + 17, ready ? col : '#6a6a88');
        if (h && cd > 0) {                                           // clockwise cooldown dial
            const f = cd / cdMax;
            ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.beginPath(); ctx.moveTo(b.x + b.w / 2, b.y + b.h / 2); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 30, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.closePath();
            ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip(); ctx.fill(); ctx.restore();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(String(Math.ceil(cd)), b.x + b.w / 2, b.y + 21);
        }
        ctx.lineWidth = aiming ? 2 : 1; ctx.strokeStyle = aiming ? '#ffffff' : (ready ? col : '#454568'); ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        ctx.fillStyle = ready ? col : '#454568'; ctx.fillRect(b.x + 1, b.y + 1, 10, 10);
        ctx.fillStyle = '#10101e'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText(HERO_KEYS[b.slot].replace('Key', ''), b.x + 6, b.y + 9);
        ctx.fillStyle = ready ? '#ffe9a0' : '#7a7a96'; ctx.font = 'bold 6px monospace'; ctx.fillText(a.name.length > 10 ? a.name.slice(0, 10) : a.name, b.x + b.w / 2, b.y + b.h - 3);
    }
    // tooltip
    const m = g.input.mouse, hb = m.inside ? g.heroButtonAt(m.x, m.y) : null;
    if (hb && abilities[hb.slot]) {
        const a = abilities[hb.slot], col = TYPE_COL[a.ability_type] || GOLD;
        const lines = [a.name + ' (' + a.cooldown_sec + 's)', a.description, HeroUnit.isAimed(a) ? 'Aimed: hotkey casts at cursor' : 'Instant'];
        ctx.font = '9px monospace'; ctx.textAlign = 'left';
        const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14, x = Math.max(4, r.x + r.w - w), y = r.y - 44;
        ctx.fillStyle = 'rgba(10,10,25,.96)'; ctx.fillRect(x, y, w, 42); ctx.strokeStyle = col; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 41); ctx.fillStyle = col; ctx.fillRect(x, y, 3, 42);
        ctx.fillText(lines[0], x + 8, y + 12); ctx.fillStyle = '#fff'; ctx.fillText(lines[1], x + 8, y + 24); ctx.fillStyle = '#aab'; ctx.fillText(lines[2], x + 8, y + 36);
    }
    ctx.restore();
    return true;
}

export function drawModernMeteor(g, ctx) {
    const locked = g.meteorLevel <= 0, { x, y, w, h } = g.meteorRect();
    const ready = !locked && g.meteorCooldown <= 0, frac = g.meteorCooldown / 25, now = performance.now() / 1000;
    ctx.save();
    const bg = ctx.createLinearGradient(0, y, 0, y + h); bg.addColorStop(0, 'rgba(48,30,40,.95)'); bg.addColorStop(1, 'rgba(16,8,18,.95)');
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x + 1, y + 1, w - 2, 2);
    if (!locked && !ready) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y + h * (1 - frac), w, h * frac); }
    ctx.strokeStyle = g.meteorAiming ? '#ffffff' : (ready ? '#ffb070' : '#4a3a4a'); ctx.lineWidth = g.meteorAiming ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // fireball with a tail
    const cx = x + 17, cy = y + h / 2 + 1, c1 = ready ? '#ff9040' : '#777', c2 = ready ? '#ffe080' : '#999';
    ctx.globalAlpha = ready ? 0.5 + 0.3 * Math.sin(now * 5) : 0.3; ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(cx - 3, cy - 3); ctx.lineTo(cx - 13, cy - 11); ctx.lineTo(cx - 6, cy + 3); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, TAU); ctx.fill(); ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 3, 0, TAU); ctx.fill();
    // text
    ctx.textAlign = 'left'; ctx.font = 'bold 10px monospace'; ctx.fillStyle = locked ? '#8a7a8a' : (ready ? '#ffc890' : '#b0a0a0');
    ctx.fillText('METEOR', x + 30, y + 14);
    ctx.font = '9px monospace'; ctx.fillStyle = ready ? '#7fff9f' : '#9a8a9a';
    ctx.fillText(locked ? 'LOCKED' : (ready ? 'READY' : Math.ceil(g.meteorCooldown) + 's') + (locked ? '' : '  Lv' + g.meteorLevel), x + 30, y + 26);
    ctx.fillStyle = ready ? '#ffb070' : '#4a3a4a'; ctx.fillRect(x + 1, y + 1, 11, 11); ctx.fillStyle = '#10101e'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('E', x + 6.5, y + 10);
    ctx.restore();
    return true;
}