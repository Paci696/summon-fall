// ModernHud.js - redesigned in-game HUD: resource panel (top-left), wave panel (top-right),
// hero level bar (top-centre) and the spell bar. Replaces the old drawHud when drawModernHud() returns true.
import { drawHeroLevelHud } from './HeroLevelHud.js';
import { drawGeneralSpells } from './GeneralSpells.js';

const TAU = Math.PI * 2;
const GOLD = '#ffcf5a', INK = '#07061a';

function panel(ctx, x, y, w, h, accent = GOLD) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(30,26,62,.92)'); g.addColorStop(1, 'rgba(10,8,26,.92)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x + 1, y + 1, w - 2, 2);                 // top sheen
    ctx.strokeStyle = '#34345a'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = accent;                                                                           // gold corner brackets
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { ctx.fillRect(cx - (sx < 0 ? 5 : 0), cy - (sy < 0 ? 1 : 0), 5, 1); ctx.fillRect(cx - (sx < 0 ? 1 : 0), cy - (sy < 0 ? 5 : 0), 1, 5); }
    ctx.fillStyle = INK; ctx.fillRect(x + 2, y + h, w, 2);                                           // hard pixel drop shadow
}
function coin(ctx, x, y, r) { ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(x - 0.5, y - 0.5, r - 1.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff4b0'; ctx.fillRect(x - 3, y - 3, 2, 2); }
function gem(ctx, x, y) { ctx.fillStyle = '#7a4ac8'; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 4, y - 1); ctx.lineTo(x, y + 6); ctx.lineTo(x - 4, y - 1); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#d0a8ff'; ctx.fillRect(x - 1, y - 4, 2, 4); }
function shield(ctx, x, y) { ctx.fillStyle = '#5a8aff'; ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y - 5); ctx.lineTo(x + 5, y + 1); ctx.lineTo(x, y + 6); ctx.lineTo(x - 5, y + 1); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#c0d4ff'; ctx.fillRect(x - 1, y - 3, 2, 7); }
function skull(ctx, x, y) { ctx.fillStyle = '#e8e0cc'; ctx.beginPath(); ctx.arc(x, y - 1, 5, 0, TAU); ctx.fill(); ctx.fillRect(x - 3, y + 2, 6, 4); ctx.fillStyle = '#14101e'; ctx.fillRect(x - 3, y - 2, 2, 2); ctx.fillRect(x + 1, y - 2, 2, 2); }
function sun(ctx, x, y) { ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); ctx.fillRect(x - 1, y - 8, 2, 3); ctx.fillRect(x - 1, y + 5, 2, 3); ctx.fillRect(x - 8, y - 1, 3, 2); ctx.fillRect(x + 5, y - 1, 3, 2); }
function moon(ctx, x, y) { ctx.fillStyle = '#cfd8ff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#1d1840'; ctx.beginPath(); ctx.arc(x + 3, y - 2, 4.5, 0, TAU); ctx.fill(); }

export function drawModernHud(ctx, g, viewW) {
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // ---- resources (top-left) ----
    const x = 6, y = 6, w = 176, h = 62;
    panel(ctx, x, y, w, h);
    coin(ctx, x + 14, y + 16, 7);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.fillText(String(g.gold), x + 27, y + 21);
    shield(ctx, x + 108, y + 15);
    const army = g.units.filter((u) => u.faction === 'player').length;
    ctx.fillStyle = '#c0d4ff'; ctx.font = 'bold 13px monospace'; ctx.fillText(String(army), x + 118, y + 20);
    ctx.fillStyle = '#8a8cc0'; ctx.font = '9px monospace'; ctx.fillText('STATUE', x + 8, y + 36);
    g.base.drawHpBar(ctx, x + 98, y + 38, 120, true);
    gem(ctx, x + 14, y + 53); ctx.fillStyle = '#d0a8ff'; ctx.font = 'bold 11px monospace'; ctx.fillText(String(g.souls), x + 24, y + 57);
    skull(ctx, x + 104, y + 52); ctx.fillStyle = '#e8e0cc'; ctx.fillText(String(g.kills), x + 114, y + 57);

    // ---- wave panel (top-right) ----
    if (g.spawner) {
        const pw = 118, ph = 62, px = viewW - pw - 6, py = 6;
        panel(ctx, px, py, pw, ph, g.dayNight && g.dayNight.dark > 0.5 ? '#9fb4ff' : GOLD);
        ctx.fillStyle = '#8a8cc0'; ctx.font = '9px monospace'; ctx.fillText('WAVE', px + 8, py + 14);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace'; ctx.fillText(String(g.spawner.wave), px + 8, py + 36);
        const nx = g.spawner.secondsToNext, urgent = nx <= 5 && Math.floor(performance.now() / 250) % 2 === 0;
        ctx.fillStyle = urgent ? '#ff8a6a' : '#c0c2ee'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'right'; ctx.fillText('NEXT ' + nx + 's', px + pw - 8, py + 14);
        ctx.fillStyle = GOLD; ctx.fillText(String(g.score), px + pw - 8, py + 34); ctx.fillStyle = '#8a8cc0'; ctx.font = '9px monospace'; ctx.fillText('SCORE', px + pw - 8, py + 44);
        ctx.textAlign = 'left';
        if (g.dayNight) {
            const night = g.dayNight.dark > 0.5;
            (night ? moon : sun)(ctx, px + 14, py + 54);
            ctx.fillStyle = night ? '#9fb4ff' : '#ffe27a'; ctx.font = 'bold 10px monospace'; ctx.fillText(String(g.dayNight.label).toUpperCase(), px + 26, py + 57);
        }
        ctx.fillStyle = '#4a4c80'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillText(Math.round(g.fps) + ' FPS', px + pw - 8, py + 57); ctx.textAlign = 'left';
    }
    ctx.restore();
    drawHeroLevelHud(ctx, g, viewW);
    drawGeneralSpells(ctx, g);
    return true;
}