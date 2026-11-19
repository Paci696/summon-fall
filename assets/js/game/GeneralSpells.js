// GeneralSpells.js - four new general spells next to Summon Fall (the meteor), all unlocked in the Skill Tree (General tab):
//   B  Blizzard       (aimed)   freezing storm: slows and damages enemies inside it
//   H  Healing Rain   (aimed)   restores your army inside it
//   U  War Horn       (instant) army-wide damage + speed rally
//   I  Lightning Storm(instant) bolts strike random enemies
// Arcane Mastery (spell_cdr) makes every spell recharge faster. Levels come from the skill tree (flatBonus).
import { flatBonus } from './Bonuses.js';

const TAU = Math.PI * 2;
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const SPELLS = [
    { id: 'frost', stat: 'spell_frost', key: 'KeyB', label: 'B', name: 'Blizzard', cd: 28, col: '#8fe0ff', aimed: true },
    { id: 'heal',  stat: 'spell_heal',  key: 'KeyH', label: 'H', name: 'Healing Rain', cd: 35, col: '#7fff9f', aimed: true },
    { id: 'horn',  stat: 'spell_rally', key: 'KeyU', label: 'U', name: 'War Horn', cd: 40, col: '#ffcf5a', aimed: false },
    { id: 'storm', stat: 'spell_storm', key: 'KeyI', label: 'I', name: 'Lightning Storm', cd: 45, col: '#c9a8ff', aimed: false },
];

function state(g) {
    if (!g._spells) g._spells = { cd: { frost: 0, heal: 0, horn: 0, storm: 0 }, fx: [], zones: [], strikes: [] };
    return g._spells;
}
const level = (g, sp) => Math.round(flatBonus(g.bonuses || [], sp.stat));
const cdMax = (g, sp) => sp.cd * Math.max(0.5, 1 - flatBonus(g.bonuses || [], 'spell_cdr') / 100);

export function updateGeneralSpells(g, dt) {
    const S = state(g);
    if (g.paused || g.gameOver) return;
    for (const sp of SPELLS) {
        if (S.cd[sp.id] > 0) S.cd[sp.id] = Math.max(0, S.cd[sp.id] - dt);
        const lv = level(g, sp);
        if (lv > 0 && g.input.wasPressed(sp.key)) cast(g, S, sp, lv);
    }
    for (const f of S.fx) f.t += dt;
    S.fx = S.fx.filter((f) => f.t < f.life);
    for (const z of S.zones) {                                   // blizzard / healing rain tick every 0.5s
        z.t += dt; z.next -= dt;
        if (z.next <= 0) {
            z.next += 0.5;
            for (const u of g.units) {
                if (!u.alive || u.state === 'falling' || Math.hypot(u.x - z.x, u.y - z.y) > z.r + u.radius) continue;
                if (z.kind === 'frost' && u.faction === 'mob') { g.dealDamage(u, z.power); u.slowT = Math.max(u.slowT || 0, 1); }
                if (z.kind === 'heal' && u.faction === 'player') {
                    const done = g.healUnit(u, z.power);
                    if (done > 0) g.effects.floatText(u.x, u.y - u.radius * 2 - 6, '+' + Math.round(done), '#6fff9a');
                }
            }
        }
    }
    S.zones = S.zones.filter((z) => z.t < z.life);
    for (const k of S.strikes) {                                 // lightning storm: queued strikes land one by one
        k.t += dt;
        if (!k.done && k.t >= k.delay) {
            k.done = true;
            const u = k.target;
            if (u && u.alive) {
                g.dealDamage(u, k.power);
                for (const o of g.units) if (o !== u && o.alive && o.faction === 'mob' && Math.hypot(o.x - u.x, o.y - u.y) < 46) g.dealDamage(o, k.power * 0.4);   // arcs to neighbours
                S.fx.push({ k: 'bolt', t: 0, life: 0.4, x: u.x, y: u.y, seed: Math.random() * 99 });
                g.shake = Math.max(g.shake || 0, 0.25);
            }
        }
    }
    S.strikes = S.strikes.filter((k) => k.t < k.delay + 0.5);
}

function cast(g, S, sp, lv) {
    if (S.cd[sp.id] > 0) { g.showBanner(sp.name + ' ready in ' + Math.ceil(S.cd[sp.id]) + 's'); return; }
    let x = 0, y = 0;
    if (sp.aimed) {
        const m = g.input.mouse;
        if (!m || !m.inside) { g.showBanner('Aim the cursor on the map, then press ' + sp.label); return; }
        const p = g.camera.screenToWorld(m.x, m.y); x = p.x; y = p.y;
    }
    S.cd[sp.id] = cdMax(g, sp);
    g.sfx.play('boom');
    if (sp.id === 'frost') {
        S.zones.push({ kind: 'frost', x, y, r: 90, t: 0, life: 7, next: 0, power: 8 + 6 * lv });
        S.fx.push({ k: 'frostcast', t: 0, life: 7, x, y, r: 90 });
    } else if (sp.id === 'heal') {
        S.zones.push({ kind: 'heal', x, y, r: 100, t: 0, life: 6, next: 0, power: 10 + 8 * lv });
        S.fx.push({ k: 'healcast', t: 0, life: 6, x, y, r: 100 });
    } else if (sp.id === 'horn') {
        for (const u of g.units) if (u.alive && u.faction === 'player') { u.buffT = 8 + 2 * lv; u.buffMult = 1.3 + 0.1 * lv; u.slowT = 0; }
        S.fx.push({ k: 'horn', t: 0, life: 1.1, x: g.base.x, y: g.base.y - 10 });
        g.showBanner('WAR HORN! Army empowered');
        g.shake = Math.max(g.shake || 0, 0.4);
    } else {
        const mobs = g.units.filter((u) => u.alive && u.faction === 'mob' && u.state !== 'falling');
        if (!mobs.length) { S.cd[sp.id] = 0; g.showBanner('No enemies to strike'); return; }
        const n = 6 + 2 * lv;
        for (let i = 0; i < n; i++) S.strikes.push({ t: 0, delay: 0.25 + i * 0.28, done: false, target: mobs[Math.floor(Math.random() * mobs.length)], power: 35 + 20 * lv });
        S.fx.push({ k: 'sky', t: 0, life: 0.3 + n * 0.28 + 0.4 });
        g.showBanner('LIGHTNING STORM!');
    }
}

export function drawGeneralSpells(ctx, g) {
    const S = state(g), cam = g.camera, now = performance.now() / 1000;
    ctx.save();
    for (const f of S.fx) {
        const k = f.t / f.life, s = f.x !== undefined ? cam.worldToScreen(f.x, f.y) : null;
        ctx.globalAlpha = 1;
        if (f.k === 'frostcast') {                                // swirling snow + ice shards inside the field
            const a = Math.min(1, (f.life - f.t) * 2, f.t * 4);
            ctx.globalAlpha = 0.25 * a; ctx.fillStyle = '#9fe4ff'; ctx.beginPath(); ctx.ellipse(s.x, s.y, f.r, f.r / 2, 0, 0, TAU); ctx.fill();
            ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = '#d8f6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, s.y, f.r, f.r / 2, 0, 0, TAU); ctx.stroke();
            for (let i = 0; i < 26; i++) { const an = rnd(i) * TAU + now * (0.8 + rnd(i + 1)), d = rnd(i + 2) * f.r, px = s.x + Math.cos(an) * d, py = s.y + Math.sin(an) * d * 0.5 - ((now * 30 + i * 9) % 40);
                ctx.fillStyle = i % 3 ? '#ffffff' : '#9fe4ff'; ctx.fillRect(Math.round(px), Math.round(py + 20), 2, 2); }
            for (let i = 0; i < 6; i++) { const an = i * TAU / 6 + 0.4, px = s.x + Math.cos(an) * f.r * 0.7, py = s.y + Math.sin(an) * f.r * 0.35;
                ctx.fillStyle = '#c8f2ff'; ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.fill(); }
        } else if (f.k === 'healcast') {                          // green rain of crosses
            const a = Math.min(1, (f.life - f.t) * 2, f.t * 4);
            ctx.globalAlpha = 0.18 * a; ctx.fillStyle = '#7fff9f'; ctx.beginPath(); ctx.ellipse(s.x, s.y, f.r, f.r / 2, 0, 0, TAU); ctx.fill();
            ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = '#d8ffe4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, s.y, f.r, f.r / 2, 0, 0, TAU); ctx.stroke();
            for (let i = 0; i < 18; i++) { const per = 0.9, tt = ((now + rnd(i) * 3) % per) / per, px = Math.round(s.x + (rnd(i + 3) - 0.5) * f.r * 1.8), py = Math.round(s.y + (rnd(i + 6) - 0.5) * f.r * 0.8 - 50 + tt * 50);
                ctx.globalAlpha = a * (1 - tt * 0.4); ctx.fillStyle = i % 3 ? '#7fff9f' : '#ffffff'; ctx.fillRect(px - 1, py - 3, 2, 6); ctx.fillRect(px - 3, py - 1, 6, 2); }
        } else if (f.k === 'horn') {                              // rally shockwaves from the statue
            for (let r = 0; r < 3; r++) { const kk = Math.max(0, k - r * 0.15); if (kk <= 0) continue;
                ctx.globalAlpha = 1 - kk; ctx.strokeStyle = r % 2 ? '#fff0a0' : '#ffcf5a'; ctx.lineWidth = 4 - r; ctx.beginPath(); ctx.ellipse(s.x, s.y, 20 + kk * 240, (20 + kk * 240) / 2, 0, 0, TAU); ctx.stroke(); }
            if (k < 0.25) { ctx.globalAlpha = (0.25 - k) * 3; ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.ellipse(s.x, s.y - 12, 40, 30, 0, 0, TAU); ctx.fill(); }
        } else if (f.k === 'sky') {                               // darkened sky flicker during the storm
            const fl = Math.sin(now * 40) > 0.85 ? 0.12 : 0;
            ctx.globalAlpha = Math.min(0.22, f.t * 0.6, (f.life - f.t) * 0.6) + fl; ctx.fillStyle = '#2a1a5a'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        } else if (f.k === 'bolt') {                              // jagged bolt from the sky + ground flash
            ctx.globalAlpha = 1 - k; ctx.lineCap = 'round';
            for (const [w, col] of [[7, 'rgba(180,140,255,.35)'], [3, '#d8c4ff'], [1.5, '#ffffff']]) {
                ctx.strokeStyle = col; ctx.lineWidth = w * (1 - k * 0.5); ctx.beginPath(); ctx.moveTo(s.x + (rnd(f.seed) - 0.5) * 20, s.y - 220);
                for (let i = 1; i <= 8; i++) ctx.lineTo(s.x + (i < 8 ? (rnd(f.seed + i) - 0.5) * 22 : 0), s.y - 220 + (220 * i) / 8);
                ctx.stroke();
            }
            ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = '#f0e4ff'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 26 * (0.5 + k), 12 * (0.5 + k), 0, 0, TAU); ctx.fill();
            ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fff'; for (let i = 0; i < 8; i++) ctx.fillRect(Math.round(s.x + (rnd(i + f.seed) - 0.5) * 50 * k), Math.round(s.y - rnd(i + 9) * 24 * k), 2, 2);
            ctx.lineCap = 'butt';
        }
    }
    ctx.restore();
    drawSpellBar(ctx, g, S, now);
}

// small spell icons next to the Summon Fall button (only spells you have unlocked)
function drawSpellBar(ctx, g, S, now) {
    const base = g.meteorRect ? g.meteorRect() : { x: 8, y: 440, w: 112, h: 32 };
    let i = 0;
    for (const sp of SPELLS) {
        const lv = level(g, sp); if (lv <= 0) continue;
        const x = base.x + base.w + 6 + i * 38, y = base.y, w = 34, h = base.h + 0;
        const cd = S.cd[sp.id], ready = cd <= 0, frac = ready ? 0 : cd / cdMax(g, sp);
        ctx.save();
        ctx.fillStyle = 'rgba(8,6,22,.85)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = ready ? sp.col : '#4a4a70'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.strokeStyle = sp.col; ctx.fillStyle = sp.col; ctx.lineWidth = 2; ctx.translate(x + w / 2, y + h / 2 + 2);
        ctx.globalAlpha = ready ? 1 : 0.45;
        if (sp.id === 'frost') { for (let a = 0; a < 3; a++) { ctx.beginPath(); ctx.moveTo(-8 * Math.cos(a * 1.047), -8 * Math.sin(a * 1.047)); ctx.lineTo(8 * Math.cos(a * 1.047), 8 * Math.sin(a * 1.047)); ctx.stroke(); } }
        else if (sp.id === 'heal') { ctx.fillRect(-2, -8, 4, 16); ctx.fillRect(-8, -2, 16, 4); }
        else if (sp.id === 'horn') { ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(0, -3); ctx.lineTo(8, -9); ctx.lineTo(8, 9); ctx.lineTo(0, 3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(3, -10); ctx.lineTo(-5, 1); ctx.lineTo(0, 1); ctx.lineTo(-3, 10); ctx.lineTo(6, -2); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        if (!ready) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x + 2, y + 2 + (h - 4) * (1 - frac), w - 4, (h - 4) * frac); ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText(String(Math.ceil(cd)), x + w / 2, y + h / 2 + 4); }
        ctx.fillStyle = sp.col; ctx.fillRect(x + 2, y + 2, 11, 11); ctx.fillStyle = '#10101e'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText(sp.label, x + 7.5, y + 11);
        if (ready && g.input.mouse && g.input.mouse.inside && g.input.mouse.x >= x && g.input.mouse.x <= x + w && g.input.mouse.y >= y && g.input.mouse.y <= y + h) {
            ctx.fillStyle = 'rgba(8,6,22,.95)'; ctx.fillRect(x - 20, y - 22, 110, 18); ctx.fillStyle = sp.col; ctx.font = '10px monospace'; ctx.textAlign = 'left'; ctx.fillText(sp.name + ' Lv' + lv, x - 16, y - 9);
        }
        i++;
    }
}