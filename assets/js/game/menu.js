// Animated night scene behind the title menu. Uses the game's own pixel art.
import { getArt } from './art.js';
import { getUnitSheet } from './UnitArt.js';
import { getHeroSheet } from './HeroArt.js';
import { getHeroFrames, HeroAnimator } from './HeroAnim.js';
import { getRankFrames, RankAnimator } from './EliteArt.js';

const canvas = document.getElementById('title-bg');
const ctx = canvas.getContext('2d');
const art = getArt();
const sheet = getUnitSheet();
const heroSheet = getHeroSheet();
const heroKey = canvas.dataset.hero, heroName = canvas.dataset.heroName || '';

let W = 0, H = 0, S = 4;           // S = pixel scale of sprites
const rnd = (a, b) => a + Math.random() * (b - a);

const stars = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random() * 0.62, r: rnd(0.6, 1.8), p: rnd(0, 6.28), s: rnd(0.6, 2) }));
const flies = Array.from({ length: 34 }, () => ({ x: Math.random(), y: rnd(0.45, 0.95), p: rnd(0, 6.28), s: rnd(0.2, 0.6), c: Math.random() < 0.5 ? '176,112,255' : '255,207,90' }));
const trees = Array.from({ length: 26 }, (_, i) => ({ x: i / 25 + rnd(-0.02, 0.02), layer: i % 3, f: rnd(0.8, 1.2) }));
// the four guards show the HIGHEST version the player has unlocked: godly > elite > base
let unlocked = {};
try { unlocked = JSON.parse(canvas.dataset.units || '{}'); } catch (e) { /* default below */ }
const guards = ['swordsman', 'archer', 'mage', 'healer'].filter((k) => unlocked[k] !== undefined || !Object.keys(unlocked).length);
const guardAnims = {};
let guardT = 0;

function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.max(2, Math.round(Math.min(W, H * 1.78) / 360));
}
window.addEventListener('resize', resize);
resize();

function sky(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05040f'); g.addColorStop(0.55, '#171233'); g.addColorStop(1, '#2a1a45');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
        ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * s.s + s.p));
        ctx.fillStyle = '#fff';
        ctx.fillRect(s.x * W, s.y * H, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    // moon
    const mx = W * 0.72, my = H * 0.2, mr = Math.min(W, H) * 0.07;
    const mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
    mg.addColorStop(0, 'rgba(200,190,255,.35)'); mg.addColorStop(1, 'rgba(200,190,255,0)');
    ctx.fillStyle = mg; ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    ctx.fillStyle = '#ece8ff'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(150,140,200,.45)';
    ctx.beginPath(); ctx.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.15, 0, 6.28); ctx.fill();
}

function drawForestTinted(t, groundY) {
    // draw each layer to an offscreen buffer so the tint only hits the trees
    for (let layer = 0; layer < 3; layer++) {
        const buf = drawForestTinted.buf || (drawForestTinted.buf = document.createElement('canvas'));
        buf.width = W; buf.height = H;
        const b = buf.getContext('2d');
        b.imageSmoothingEnabled = false;
        for (const tr of trees) {
            if (tr.layer !== layer) continue;
            const sc = S * (1.5 + layer * 0.55) * tr.f;
            const w = 32 * sc, h = 48 * sc;
            const x = tr.x * (W + w) - w / 2 + Math.sin(t * 0.3 + tr.x * 9) * 1.5;
            const y = groundY + layer * S * 7 - h + 6 * sc;
            b.drawImage(art.trees[2], x, y, w, h);
        }
        b.globalCompositeOperation = 'source-atop';
        b.fillStyle = ['rgba(6,4,20,.9)', 'rgba(14,10,38,.78)', 'rgba(30,20,62,.6)'][layer];
        b.fillRect(0, 0, W, H);
        b.globalCompositeOperation = 'source-over';
        ctx.drawImage(buf, 0, 0);
    }
}

function ground(groundY) {
    const g = ctx.createLinearGradient(0, groundY, 0, H);
    g.addColorStop(0, '#120d26'); g.addColorStop(1, '#07050f');
    ctx.fillStyle = g; ctx.fillRect(0, groundY + S * 12, W, H);
    const mist = ctx.createLinearGradient(0, groundY - S * 6, 0, groundY + S * 20);
    mist.addColorStop(0, 'rgba(120,90,200,0)'); mist.addColorStop(0.5, 'rgba(120,90,200,.18)'); mist.addColorStop(1, 'rgba(120,90,200,0)');
    ctx.fillStyle = mist; ctx.fillRect(0, groundY - S * 6, W, S * 26);
}

function statue(t, cx, groundY) {
    const sc = S * 1.05;
    const w = 64 * sc, h = 112 * sc;
    const x = cx - w / 2, y = groundY + S * 16 - h;
    // glow behind
    const gs = 72 * sc * 1.8, pulse = 0.75 + 0.25 * Math.sin(t * 1.6);
    ctx.globalAlpha = pulse;
    ctx.drawImage(art.crystalGlow, cx - gs / 2, y - gs * 0.1, gs, gs);
    ctx.globalAlpha = 1;
    ctx.drawImage(art.statue, x, y, w, h);
    const bob = Math.sin(t * 1.4) * sc * 1.2;
    const cw = 16 * sc, ch = 28 * sc;
    ctx.drawImage(art.crystal, cx - cw / 2, y - ch * 0.35 + bob, cw, ch);
    // little guard line
    const cell = sheet.cell, us = S * 1.35;
    const dtG = Math.min(100, Math.max(0, (t - guardT) * 1000)); guardT = t;
    guards.forEach((k, i) => {
        const tier = Math.min(2, unlocked[k] || 0);
        const fr = getRankFrames(k, tier); if (!fr) return;
        const an = guardAnims[k] || (guardAnims[k] = new RankAnimator(fr));
        an.update(dtG);
        an.play(Math.floor(t / 4 + i) % 3 === 0 && (t % 4) < 0.7 ? 'attack' : 'idle');
        const gx = cx + (i < 2 ? -1 : 1) * (w * 0.62 + (i % 2) * fr.cell * us * 0.7);
        an.draw(ctx, gx, groundY + S * 16, i < 2 ? false : true, us);
    });
}

let heroAnim = null, lastT = 0;
function hero(t, cx, groundY) {
    const spot = heroSheet.units[heroKey];
    if (!spot) return;
    if (!heroAnim) { const hf = getHeroFrames(heroKey); if (hf) heroAnim = new HeroAnimator(hf); }
    if (heroAnim) {                                   // animated hero: idles, and swings every few seconds
        const dt = Math.max(0, (t - lastT) * 1000); lastT = t; heroAnim.update(Math.min(dt, 100));
        heroAnim.play(Math.floor(t / 3.5) % 2 && (t % 3.5) < 0.6 ? 'attack' : 'idle');
        const size = S * 54, feet = groundY + S * 34;
        const g2 = ctx.createRadialGradient(cx, feet, 2, cx, feet, size * 0.7);
        g2.addColorStop(0, 'rgba(255,207,90,.35)'); g2.addColorStop(1, 'rgba(255,207,90,0)');
        ctx.fillStyle = g2; ctx.fillRect(cx - size, feet - size * 0.3, size * 2, size * 0.6);
        heroAnim.draw(ctx, cx, feet, false, size / 48 * 0.92);
        if (heroName) {
            ctx.font = Math.max(9, S * 3) + 'px "Press Start 2P", monospace'; ctx.textAlign = 'center';
            const label = heroName.toUpperCase(), ty = feet + S * 10;
            ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(label, cx + 2, ty + 2);
            ctx.fillStyle = '#ffcf5a'; ctx.fillText(label, cx, ty); ctx.textAlign = 'left';
        }
        return;
    }
    const cell = heroSheet.cell, size = S * 54, sc = size / cell;
    const feet = groundY + S * 34;
    const x = cx - size / 2, y = feet - size * 0.92 + Math.sin(t * 2.2) * S * 0.8;
    const g = ctx.createRadialGradient(cx, feet, 2, cx, feet, size * 0.7);
    g.addColorStop(0, 'rgba(255,207,90,.35)'); g.addColorStop(1, 'rgba(255,207,90,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - size, feet - size * 0.3, size * 2, size * 0.6);
    ctx.drawImage(heroSheet.canvas, spot.right[0] * cell, 0, cell, cell, x, y, size, size);
    if (heroName) {
        ctx.font = Math.max(9, S * 3) + 'px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const label = heroName.toUpperCase(), ty = feet + S * 10;
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(label, cx + 2, ty + 2);
        ctx.fillStyle = '#ffcf5a'; ctx.fillText(label, cx, ty);
        ctx.textAlign = 'left';
    }
}

function flyPass(t) {
    for (const f of flies) {
        f.p += 0.01;
        const x = (f.x + Math.sin(f.p * f.s * 3) * 0.02) * W;
        const yy = (((f.y - t * f.s * 0.012) % 1) + 1) % 1 * H * 0.6 + H * 0.38;
        const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + f.p));
        const r = 3 + f.s * 6;
        const g = ctx.createRadialGradient(x, yy, 0, x, yy, r * 2);
        g.addColorStop(0, 'rgba(' + f.c + ',' + a + ')'); g.addColorStop(1, 'rgba(' + f.c + ',0)');
        ctx.fillStyle = g; ctx.fillRect(x - r * 2, yy - r * 2, r * 4, r * 4);
    }
}

const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let last = 0;
function frame(ms) {
    requestAnimationFrame(frame);
    if (ms - last < 33 && !reduce) return;   // ~30fps is plenty and keeps it light
    last = ms;
    const t = reduce ? 0 : ms / 1000;
    ctx.imageSmoothingEnabled = false;
    const groundY = H * 0.74;
    sky(t);
    drawForestTinted(t, groundY - S * 6);
    ground(groundY);
    statue(t, W * (W > 900 ? 0.7 : 0.5), groundY);
    hero(t, W * (W > 900 ? 0.7 : 0.5), groundY);
    flyPass(t);
}
requestAnimationFrame(frame);