// HeroSkillFx.js - an animation for every hero skill. Pure drawing: HeroUnit.js calls
//   fxSpawn(hero, ability, aim)  when a skill is cast
//   fxUpdate(hero, dt)           every frame
//   fxDraw(hero, ctx)            while drawing the hero (effects are placed with the game camera)
const TAU = Math.PI * 2;
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function fxSpawn(h, a, aim) {
    const list = h.fx || (h.fx = []);
    const x = h.x, y = h.y, t = a.ability_type, seed = Math.random() * 100;
    const add = (o) => list.push({ t: 0, seed, x, y, ...o });
    switch (t) {
        case 'dash': add({ k: 'dashflash', life: 0.3, dx: aim.dx, dy: aim.dy }); break;
        case 'shield': add({ k: 'shieldpop', life: 0.5 }); break;
        case 'buff':
            if (a.radius > 0) add({ k: 'warcry', life: 0.95, r: a.radius });
            else add({ k: 'rapidpop', life: 0.5 });
            break;
        case 'line': add({ k: 'beam', life: 0.42, dx: aim.dx, dy: aim.dy, len: 240, w: Math.max(6, a.radius) }); break;
        case 'area':
            if (a.duration_sec > 0) add({ k: 'volley', life: 0.3 + a.duration_sec, zx: aim.zx, zy: aim.zy, r: a.radius });
            else add({ k: 'meteor', life: 0.45 + 0.6, zx: aim.zx, zy: aim.zy, r: a.radius });
            break;
        case 'nova': add({ k: 'nova', life: 0.8, r: a.radius }); break;
        case 'raise': add({ k: 'ritual', life: 1.1, r: a.radius }); break;
        case 'shift': add({ k: 'shift', life: 0.9 }); break;
        case 'heal': add({ k: 'heal', life: 1.0, r: a.radius }); break;
    }
}

export function fxUpdate(h, dt) {
    const list = h.fx; if (!list) return;
    for (const f of list) f.t += dt;
    h.fx = list.filter((f) => f.t < f.life);
    if (h.dash) {                                         // afterimages while dashing
        h._ghostT = (h._ghostT || 0) - dt;
        if (h._ghostT <= 0) { h._ghostT = 0.028; h.fx.push({ k: 'ghost', t: 0, life: 0.3, x: h.x, y: h.y, dx: h.dash.dx, dy: h.dash.dy, seed: Math.random() * 9 }); }
    }
}

export function fxDraw(h, ctx) {
    const g = h.game; if (!g || !g.camera) return;
    const P = (wx, wy) => g.camera.worldToScreen(wx, wy);
    const now = performance.now() / 1000;
    ctx.save();
    // ---- persistent states ----
    const c = P(h.x, h.y);
    if (h.shieldT > 0) {                                  // rotating shield dome
        const a = Math.min(1, h.shieldT * 2) * 0.9, r = h.radius + 12;
        ctx.globalAlpha = a * 0.22; ctx.fillStyle = '#7fd4ff';
        ctx.beginPath(); ctx.ellipse(c.x, c.y - r * 0.9, r, r * 1.15, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = a; ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 1.5; ctx.stroke();
        for (let i = 0; i < 6; i++) { const an = now * 1.4 + i * TAU / 6; ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(c.x + Math.cos(an) * r), Math.round(c.y - r * 0.9 + Math.sin(an) * r * 1.15), 2, 2); }
    }
    if (h.rapidT > 0) {                                   // rapid-fire sparks + speed ticks
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffe680';
        for (let i = 0; i < 6; i++) { const p = (now * 2.2 + i / 6) % 1; ctx.fillRect(Math.round(c.x - 14 + rnd(i) * 28), Math.round(c.y - 8 - p * 30), 2, 3); }
    }
    if (h.buffT > 0) {                                    // war-cry glow
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(now * 8); ctx.strokeStyle = '#ffaa3c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(c.x, c.y, h.radius + 5, (h.radius + 5) / 2, 0, 0, TAU); ctx.stroke();
    }
    if (h.wolfT > 0) {                                    // wolf: red haze + drifting embers
        ctx.globalAlpha = 0.18 + 0.06 * Math.sin(now * 6); ctx.fillStyle = '#ff3030';
        ctx.beginPath(); ctx.ellipse(c.x, c.y - 8, 18, 20, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#ff9a5a';
        for (let i = 0; i < 4; i++) { const p = (now * 1.2 + i / 4) % 1; ctx.fillRect(Math.round(c.x - 12 + rnd(i + 3) * 24), Math.round(c.y - 6 - p * 28), 2, 2); }
    }
    // ---- one-shot effects ----
    for (const f of h.fx || []) {
        const k = f.t / f.life, s = P(f.x, f.y);
        ctx.globalAlpha = 1; ctx.setLineDash([]);
        const ring = (r, col, w = 2, al = 1 - k) => { ctx.globalAlpha = Math.max(0, al); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(s.x, s.y, r, r / 2, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; };
        switch (f.k) {
            case 'ghost': {                                // dash afterimage streak
                ctx.globalAlpha = 0.5 * (1 - k); ctx.fillStyle = '#ff9a50';
                ctx.beginPath(); ctx.ellipse(s.x, s.y - 8, 7, 12, 0, 0, TAU); ctx.fill();
                ctx.fillStyle = '#ffe0b0'; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(s.x - f.dx * (6 + i * 5)), Math.round(s.y - 14 + i * 6), 6, 1);
                break;
            }
            case 'dashflash': ring(10 + k * 26, '#ffb070', 2); break;
            case 'shieldpop': ring(10 + k * 30, '#9fdcff', 3); break;
            case 'rapidpop': ring(8 + k * 22, '#ffe680', 2); break;
            case 'warcry': {
                const r = f.r;
                ring(r * Math.min(1, k * 1.6), '#ffaa3c', 3); ring(r * Math.min(1, Math.max(0, k * 1.6 - 0.25)), '#fff0a0', 2);
                ctx.globalAlpha = (1 - k) * 0.8; ctx.fillStyle = '#ffcf5a';
                for (let i = 0; i < 14; i++) {                // rising chevrons
                    const an = rnd(i + f.seed) * TAU, d = rnd(i * 3 + 1) * r * 0.9, px = s.x + Math.cos(an) * d, py = s.y + Math.sin(an) * d * 0.5 - k * 40;
                    ctx.fillRect(Math.round(px - 3), Math.round(py), 2, 2); ctx.fillRect(Math.round(px - 1), Math.round(py - 2), 2, 2); ctx.fillRect(Math.round(px + 1), Math.round(py), 2, 2);
                }
                if (k < 0.2) { ctx.globalAlpha = (0.2 - k) * 3; ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.ellipse(s.x, s.y - 8, 26, 30, 0, 0, TAU); ctx.fill(); }
                break;
            }
            case 'beam': {                                  // piercing bolt
                const e = P(f.x + f.dx * f.len, f.y + f.dy * f.len), y0 = s.y - 10, y1 = e.y - 10, a = 1 - k;
                ctx.lineCap = 'round';
                for (const [w, col, al] of [[f.w * 1.6, 'rgba(255,200,90,.25)', a], [f.w * 0.7, '#ffd24a', a], [Math.max(2, f.w * 0.25), '#ffffff', a]]) {
                    ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = w * (1 - k * 0.6);
                    ctx.beginPath(); ctx.moveTo(s.x, y0);
                    for (let i = 1; i <= 8; i++) { const t = i / 8; ctx.lineTo(s.x + (e.x - s.x) * t, y0 + (y1 - y0) * t + (i < 8 ? (rnd(i + Math.floor(f.t * 30)) - 0.5) * 4 : 0)); }
                    ctx.stroke();
                }
                ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x + f.dx * 8, y0 + f.dy * 4, 7 * (1 - k), 0, TAU); ctx.fill();
                for (let i = 0; i < 8; i++) ctx.fillRect(Math.round(s.x + (e.x - s.x) * rnd(i + 5) + (rnd(i) - 0.5) * 8), Math.round(y0 + (y1 - y0) * rnd(i + 5) + (rnd(i + 9) - 0.5) * 8), 2, 2);
                ctx.lineCap = 'butt';
                break;
            }
            case 'meteor': {                                // fireball falls, then explodes
                const fall = 0.45, z = P(f.zx, f.zy);
                if (f.t < fall) {
                    const q = f.t / fall, px = z.x - 40 * (1 - q), py = z.y - 220 * (1 - q * q);
                    for (let i = 0; i < 8; i++) { ctx.globalAlpha = (1 - i / 8) * 0.8; ctx.fillStyle = i < 3 ? '#fff0a0' : '#ff8a30'; ctx.beginPath(); ctx.arc(px + i * 5, py - i * 11 * 0.5 + 0, 8 - i * 0.8, 0, TAU); ctx.fill(); }
                    ctx.globalAlpha = 1; ctx.fillStyle = '#ffd070'; ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - 2, py - 2, 4, 0, TAU); ctx.fill();
                } else {
                    const q = (f.t - fall) / (f.life - fall);
                    ctx.globalAlpha = (1 - q) * 0.9; ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.ellipse(z.x, z.y, f.r * (0.3 + 0.8 * q), f.r * (0.3 + 0.8 * q) / 2, 0, 0, TAU); ctx.fill();
                    ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.ellipse(z.x, z.y - 4, f.r * 0.5 * (1 - q * 0.6), f.r * 0.3 * (1 - q * 0.6), 0, 0, TAU); ctx.fill();
                    ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(z.x, z.y, f.r * (0.4 + q), f.r * (0.4 + q) / 2, 0, 0, TAU); ctx.stroke();
                    ctx.fillStyle = '#ffb040'; for (let i = 0; i < 14; i++) { const an = rnd(i) * TAU, d = f.r * q * (0.6 + rnd(i + 4)), up = q * 30 * rnd(i + 8); ctx.fillRect(Math.round(z.x + Math.cos(an) * d), Math.round(z.y + Math.sin(an) * d * 0.5 - up), 2, 2); }
                }
                break;
            }
            case 'volley': {                                // arrow rain
                const z = P(f.zx, f.zy);
                ctx.globalAlpha = 0.18 * (1 - k); ctx.fillStyle = '#fff0a0'; ctx.beginPath(); ctx.ellipse(z.x, z.y, f.r, f.r / 2, 0, 0, TAU); ctx.fill();
                ctx.globalAlpha = 1; ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 1;
                for (let i = 0; i < 16; i++) {
                    const per = 0.28, tt = ((f.t * 3 + rnd(i) * 3) % per) / per, ax = z.x + (rnd(i + 2) - 0.5) * f.r * 1.8, ay = z.y + (rnd(i + 6) - 0.5) * f.r - 70 + tt * 70;
                    ctx.beginPath(); ctx.moveTo(ax, ay - 12); ctx.lineTo(ax, ay); ctx.stroke(); ctx.fillStyle = '#d23b3b'; ctx.fillRect(Math.round(ax) - 1, Math.round(ay) - 13, 2, 3);
                    if (tt > 0.92) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(ax) - 2, Math.round(z.y + (rnd(i + 6) - 0.5) * f.r), 4, 1); }
                }
                break;
            }
            case 'nova': {                                  // frost nova / howl shockwave
                const r = f.r * Math.min(1, k * 1.7);
                ring(r, '#aee8ff', 4); ring(r * 0.85, '#ffffff', 2);
                ctx.globalAlpha = (1 - k); ctx.fillStyle = '#d8f4ff';
                for (let i = 0; i < 18; i++) { const an = i * TAU / 18, d = r * (0.8 + 0.2 * rnd(i)), px = s.x + Math.cos(an) * d, py = s.y + Math.sin(an) * d * 0.5;
                    ctx.beginPath(); ctx.moveTo(px, py - 7); ctx.lineTo(px - 2, py); ctx.lineTo(px + 2, py); ctx.fill(); }
                if (k < 0.25) { ctx.globalAlpha = (0.25 - k) * 3; ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.ellipse(s.x, s.y - 6, 22, 14, 0, 0, TAU); ctx.fill(); }
                break;
            }
            case 'ritual': {                                // dark ritual: rune circle + spirits
                const r = f.r * Math.min(1, k * 3);
                ring(r, '#7dffb0', 2, 0.9 * (1 - k * k)); ring(r * 0.62, '#b070ff', 2, 0.8 * (1 - k * k));
                ctx.globalAlpha = 0.9 * (1 - k); ctx.fillStyle = '#7dffb0';
                for (let i = 0; i < 8; i++) { const an = now * 2 + i * TAU / 8; ctx.fillRect(Math.round(s.x + Math.cos(an) * r * 0.62), Math.round(s.y + Math.sin(an) * r * 0.31), 3, 3); }
                for (let i = 0; i < 14; i++) { const an = rnd(i) * TAU + k * 3, d = f.r * 0.8 * rnd(i + 2), up = k * (30 + rnd(i + 5) * 40);
                    ctx.fillStyle = i % 2 ? '#d0ffe0' : '#7dffb0'; ctx.fillRect(Math.round(s.x + Math.cos(an) * d), Math.round(s.y + Math.sin(an) * d * 0.5 - up), 2, 3 + (i % 3)); }
                break;
            }
            case 'shift': {                                 // werewolf transformation
                ring(10 + k * 44, '#ff5a3a', 3); ring(6 + k * 26, '#ffd0a0', 2);
                ctx.globalAlpha = Math.max(0, 1 - k * 1.5); ctx.fillStyle = '#fff4e0';
                ctx.beginPath(); ctx.arc(s.x, s.y - 40 + k * 8, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffb090'; ctx.beginPath(); ctx.arc(s.x + 3, s.y - 41 + k * 8, 7, 0, TAU); ctx.fill();   // moon flash
                ctx.globalAlpha = (1 - k); ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = 2;
                for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(s.x - 14 + i * 8, s.y - 36 + k * 6); ctx.lineTo(s.x + 6 + i * 8, s.y - 8 + k * 6); ctx.stroke(); }
                ctx.fillStyle = '#7a7488'; for (let i = 0; i < 10; i++) { const an = rnd(i) * TAU, d = k * 30; ctx.fillRect(Math.round(s.x + Math.cos(an) * d), Math.round(s.y - 8 + Math.sin(an) * d * 0.6 - k * 10), 4, 4); }
                break;
            }
            case 'heal': {                                  // healing rain of crosses
                ring(f.r * Math.min(1, k * 1.5), '#7fff9f', 3); ring(f.r * 0.5 * Math.min(1, k * 2), '#d8ffe4', 1);
                ctx.globalAlpha = 1 - k * k;
                for (let i = 0; i < 16; i++) { const an = rnd(i) * TAU, d = rnd(i + 3) * f.r * 0.85, px = Math.round(s.x + Math.cos(an) * d), py = Math.round(s.y + Math.sin(an) * d * 0.5 - k * 38 * (0.6 + rnd(i)));
                    ctx.fillStyle = i % 3 ? '#7fff9f' : '#ffffff'; ctx.fillRect(px - 1, py - 3, 2, 6); ctx.fillRect(px - 3, py - 1, 6, 2); }
                ctx.globalAlpha = (1 - k) * 0.35; ctx.fillStyle = '#9fffb8'; ctx.fillRect(Math.round(s.x - 6), Math.round(s.y - 60 * Math.min(1, k * 3)), 12, Math.round(60 * Math.min(1, k * 3)));
                break;
            }
        }
    }
    ctx.restore();
}