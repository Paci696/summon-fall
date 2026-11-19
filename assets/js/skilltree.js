// skilltree.js - the skill tree as a node graph. Data comes from views/skills.php (window.SKILL_TREE).
const NS = 'http://www.w3.org/2000/svg';
const TIER_COL = ['#ffcf5a', '#6fd0ff', '#ff80ff'];     // base, elite, godly
const TIER_NAME = ['Base', 'Elite', 'Godly'];
const DX = 82, DY = 88, R = 23;

const cfg = window.SKILL_TREE;
const state = { tab: 'units', group: null, sel: null, view: null, busy: false };
const $ = (s) => document.querySelector(s);

function el(name, attrs = {}, parent = null, text = null) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
}

// ---------- small icons per stat ----------
function glyph(stat, g, col) {
    const a = { class: 'st-glyph', stroke: col };
    const a2 = () => a;
    switch (stat) {
        case 'hp': el('path', { ...a, fill: col, d: 'M0 7 C-11 -1 -7 -9 0 -4 C7 -9 11 -1 0 7Z' }, g); break;
        case 'damage': el('path', { ...a, d: 'M-7 7 L6 -6 M2 -7 L7 -7 L7 -2 M-7 3 L-3 7' }, g); break;
        case 'speed': el('path', { ...a, d: 'M-7 -6 L-1 0 L-7 6 M0 -6 L6 0 L0 6' }, g); break;
        case 'range': el('circle', { ...a, r: 2.5, cx: 0, cy: 0 }, g); el('circle', { ...a, r: 7, cx: 0, cy: 0 }, g); break;
        case 'cost': case 'start_gold': el('circle', { ...a, r: 7 }, g); el('path', { ...a, d: 'M0 -3 L0 3 M-2 -1 L2 -1' }, g); break;
        case 'summon_cooldown': case 'cdr': el('circle', { ...a, r: 7 }, g); el('path', { ...a, d: 'M0 -4 L0 0 L3 2' }, g); break;
        case 'meteor': el('circle', { ...a, fill: col, r: 4, cx: 2, cy: 2 }, g); el('path', { ...a, d: 'M-1 -1 L-8 -8 M-3 2 L-9 -3' }, g); break;
        case 'ability': el('path', { ...a, fill: col, d: 'M0 -8 L2.4 -2.5 L8 -2.5 L3.6 1.5 L5 7.5 L0 4 L-5 7.5 L-3.6 1.5 L-8 -2.5 L-2.4 -2.5Z' }, g); break;
        case 'spell_frost': for (let a = 0; a < 3; a++) { const r = a * 1.047; el('path', { ...a2(), d: `M${(-8 * Math.cos(r)).toFixed(1)} ${(-8 * Math.sin(r)).toFixed(1)} L${(8 * Math.cos(r)).toFixed(1)} ${(8 * Math.sin(r)).toFixed(1)}` }, g); } break;
        case 'spell_heal': el('path', { ...a, d: 'M0 -8 L0 8 M-8 0 L8 0' }, g); break;
        case 'spell_rally': el('path', { ...a, fill: col, d: 'M-8 -3 L0 -3 L8 -9 L8 9 L0 3 L-8 3Z' }, g); break;
        case 'spell_storm': el('path', { ...a, fill: col, d: 'M3 -10 L-5 1 L0 1 L-3 10 L6 -2 L1 -2Z' }, g); break;
        case 'spell_cdr': el('circle', { ...a, r: 7 }, g); el('path', { ...a, d: 'M0 -4 L0 0 L3 2 M-9 -9 L-6 -6' }, g); break;
        case 'revive': el('path', { ...a, d: 'M0 -7 L0 7 M-7 0 L7 0' }, g); break;
        case 'raise': el('circle', { ...a, r: 5, cx: 0, cy: -2 }, g); el('path', { ...a, d: 'M-3 4 L3 4 M-2 7 L2 7' }, g); break;
        case 'horde': el('circle', { ...a, r: 3, cx: -4, cy: 0 }, g); el('circle', { ...a, r: 3, cx: 4, cy: 0 }, g); el('circle', { ...a, r: 3, cx: 0, cy: -5 }, g); break;
        default: el('path', { ...a, d: 'M0 -7 L7 0 L0 7 L-7 0Z' }, g);
    }
}

// ---------- layout ----------
function layout(groupKey) {
    const nodes = cfg.nodes.filter((n) => n.group === groupKey);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const tiers = [...new Set(nodes.map((n) => n.utier))].sort((a, b) => a - b);
    const depth = new Map();
    const srcs = new Map();        // node id -> list of source ids ('hub' allowed)
    let offset = 1, prevLast = ['hub'];
    for (const t of tiers) {
        const g = nodes.filter((n) => n.utier === t).sort((a, b) => a.tier - b.tier || a.id - b.id);
        const ranks = [...new Set(g.map((n) => n.tier))].sort((a, b) => a - b);
        const gate = g.find((n) => n.gate) || null;
        for (const n of g) {
            if (n.parent && depth.has(n.parent)) {
                depth.set(n.id, depth.get(n.parent) + 1);
                srcs.set(n.id, [n.parent]);
            } else {
                depth.set(n.id, offset + ranks.indexOf(n.tier));
                srcs.set(n.id, gate && gate !== n ? [gate.id] : prevLast);
            }
        }
        // a gate node always sits on the first row of its group
        const maxD = Math.max(...g.map((n) => depth.get(n.id)));
        prevLast = g.filter((n) => depth.get(n.id) === maxD).map((n) => n.id);
        offset = maxD + 1;
    }
    const pos = new Map([['hub', { x: 0, y: 0 }]]);
    const rows = new Map();
    for (const n of nodes) {
        const d = depth.get(n.id);
        if (!rows.has(d)) rows.set(d, []);
        rows.get(d).push(n);
    }
    for (const d of [...rows.keys()].sort((a, b) => a - b)) {
        const row = rows.get(d);
        const keyOf = (n) => {
            const s = (srcs.get(n.id) || []).map((id) => (pos.get(id) ? pos.get(id).x : 0));
            return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
        };
        row.sort((a, b) => keyOf(a) - keyOf(b) || a.id - b.id);
        row.forEach((n, i) => pos.set(n.id, { x: (i - (row.length - 1) / 2) * DX, y: -d * DY }));
    }
    return { nodes, byId, srcs, pos, depth, tiers };
}

// ---------- hub pictures (generated sprites, same art as the game) ----------
const hubCache = {};
// --- unit art for the tree: base / Elite / Godly versions (EliteArt.js) and the redrawn heroes (HeroRedraw.js) ---
const rankCache = {};
async function rankImg(key, rank) {
    const id = key + ':' + rank;
    if (id in rankCache) return rankCache[id];
    rankCache[id] = null;
    try {
        const m = await import('./game/EliteArt.js');
        const f = m.getRankFrames(key, rank);
        if (f) {
            const c = document.createElement('canvas'); c.width = c.height = f.cell;
            const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
            g.drawImage(f.canvas, f.index.idle[0] * f.cell, 0, f.cell, f.cell, 0, 0, f.cell, f.cell);
            rankCache[id] = c.toDataURL();
        }
    } catch (e) { /* falls back to the old art */ }
    return rankCache[id];
}
async function heroImg(key) {
    try {
        const m = await import('./game/HeroRedraw.js');
        const f = m.getRedrawnHero(key);
        if (!f) return null;
        const c = document.createElement('canvas'); c.width = c.height = f.cell;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
        g.drawImage(f.canvas, f.index.idle[0] * f.cell, 0, f.cell, f.cell, 0, 0, f.cell, f.cell);
        return c.toDataURL();
    } catch (e) { return null; }
}

async function hubImage(group) {
    if (group in hubCache) return hubCache[group];
    hubCache[group] = null;
    try {
        if (group.startsWith('line:')) { const u = await rankImg(group.slice(5), 0); if (u) return (hubCache[group] = u); }
        if (group.startsWith('hero:')) { const h0 = cfg.heroes.find((x) => 'hero:' + x.id === group); const u = h0 && await heroImg(h0.sprite_key); if (u) return (hubCache[group] = u); }
        let sheet, key;
        if (group.startsWith('hero:')) {
            const h = cfg.heroes.find((x) => 'hero:' + x.id === group);
            if (!h) return null;
            sheet = (await import('./game/HeroArt.js')).getHeroSheet();
            key = h.sprite_key;
        } else if (group.startsWith('line:')) {
            sheet = (await import('./game/UnitArt.js')).getUnitSheet();
            key = group.slice(5);
        } else return null;
        const spot = sheet.units[key];
        if (!spot) return null;
        const c = document.createElement('canvas');
        c.width = c.height = sheet.cell;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(sheet.canvas, spot.right[0] * sheet.cell, 0, sheet.cell, sheet.cell, 0, 0, sheet.cell, sheet.cell);
        hubCache[group] = c.toDataURL();
    } catch (e) { /* no sprite: the hub shows a letter */ }
    return hubCache[group];
}

// ---------- drawing ----------
let svg, world, justDragged = false;

function fitView(L) {
    // show about six rows from the hub; the rest of a tall tree is reached by dragging up
    const MAXROWS = 4;
    let minX = -90, maxX = 90, minY = -50, maxY = 50;
    for (const [id, pt] of L.pos) {
        if (id !== 'hub' && L.depth.get(id) > MAXROWS) continue;
        minX = Math.min(minX, pt.x - 70); maxX = Math.max(maxX, pt.x + 70);
        minY = Math.min(minY, pt.y - 80); maxY = Math.max(maxY, pt.y + 70);
    }
    const stage = $('.st-stage');
    const SW = stage.clientWidth || 900, SH = stage.clientHeight || 560;
    const TOP = 110, BOTTOM = 150;                   // room for the tab bar and the floating skill panel
    let w = maxX - minX, h = maxY - minY;
    const k = Math.max(w / SW, h / (SH - TOP - BOTTOM));   // world units per screen pixel
    const nw = k * SW, nh = k * SH;
    minX -= (nw - w) / 2;
    minY -= TOP * k + (nh - h - (TOP + BOTTOM) * k) / 2;
    w = nw; h = nh;
    state.view = { x: minX, y: minY, w, h };
}

function applyView() {
    const v = state.view;
    svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
}

async function render(keepView = false) {
    const L = layout(state.group);
    if (!keepView || !state.view) fitView(L);
    world.replaceChildren();
    applyView();

    // tinted bands behind each tier, with a row label (only for unit lines)
    if (state.group.startsWith('line:')) {
        const leftX = Math.min(...[...L.pos.values()].map((pt) => pt.x)) - 110;
        L.tiers.forEach((t) => {
            const rows = L.nodes.filter((n) => n.utier === t).map((n) => L.depth.get(n.id));
            const band = el('rect', { class: 'st-band', x: -900, width: 1800, y: -Math.max(...rows) * DY - DY / 2 + 4, height: (Math.max(...rows) - Math.min(...rows) + 1) * DY - 8 }, world);
            band.style.fill = TIER_COL[t];
            el('rect', { x: -900, width: 1800, height: 2, y: -Math.max(...rows) * DY - DY / 2 + 4, style: `fill:${TIER_COL[t]};opacity:.35` }, world);
            const t0 = el('text', { class: 'st-rowlabel', x: leftX, y: -Math.min(...rows) * DY }, world, TIER_NAME[t].toUpperCase());
            t0.style.fill = TIER_COL[t];
            t0.style.fontSize = '16px';
        });
    }

    // edges
    const edges = el('g', {}, world);
    for (const n of L.nodes) {
        const to = L.pos.get(n.id);
        for (const sid of L.srcs.get(n.id) || []) {
            const from = L.pos.get(sid);
            if (!from) continue;
            const lit = sid === 'hub' ? n.level > 0 : (L.byId.get(sid) ? L.byId.get(sid).level > 0 && n.level > 0 : false);
            const my = (from.y + to.y) / 2;
            el('path', {
                class: 'st-edge' + (lit ? ' lit' : ''),
                d: `M${from.x} ${from.y} C${from.x} ${my} ${to.x} ${my} ${to.x} ${to.y}`,
                style: lit ? `stroke:${TIER_COL[n.utier]}` : '',
            }, edges);
        }
    }

    // hub
    const hub = el('g', { transform: 'translate(0,0)' }, world);
    el('circle', { r: 34, fill: '#17142f', stroke: '#ffcf5a', 'stroke-width': 3 }, hub);
    const img = await hubImage(state.group);
    if (img) {
        el('image', { href: img, x: -26, y: -30, width: 52, height: 52, style: 'image-rendering:pixelated' }, hub);
    } else {
        const label = (cfg.groups.find((g) => g.key === state.group) || { label: '?' }).label;
        el('text', { class: 'st-hubtext' }, hub, label.charAt(0).toUpperCase());
    }

    // art for the Elite / Godly unit-unlock nodes
    const lineKey = state.group.startsWith('line:') ? state.group.slice(5) : null;
    const gateArt = {};
    if (lineKey) for (const t of [1, 2]) gateArt[t] = await rankImg(lineKey, t);

    // nodes
    for (const n of L.nodes) {
        const p = L.pos.get(n.id);
        const col = TIER_COL[n.utier] || TIER_COL[0];
        const g = el('g', { class: `st-node ${n.state}${state.sel === n.id ? ' sel' : ''}`, transform: `translate(${p.x},${p.y})`, 'data-id': n.id }, world);
        g.style.setProperty('--c', col);
        el('circle', { class: 'pulse', r: R + 3, stroke: col }, g);
        const r = n.gate ? R + 5 : R;
        el('circle', { class: 'body', r, stroke: col }, g);
        el('circle', { class: 'halo', r: r + 6 }, g);
        const ic = el('g', {}, g);
        if (n.gate && gateArt[n.utier]) {
            el('image', { href: gateArt[n.utier], x: -24, y: -29, width: 48, height: 48, style: 'image-rendering:pixelated' + (n.state === 'locked' ? ';filter:grayscale(1) brightness(.55)' : '') }, ic);
        } else glyph(n.gate ? 'unit' : n.stat, ic, n.state === 'locked' ? '#8886a8' : col);
        const b = el('g', { class: 'st-badge', transform: `translate(0,${r + 2})` }, g);
        el('rect', { x: -15, y: -7, width: 30, height: 13, rx: 2 }, b);
        el('text', { x: 0, y: 3 }, b, `${n.level}/${n.max}`);
        g.addEventListener('click', (e) => { e.stopPropagation(); if (!justDragged) select(n.id); });
    }
    renderPanel();
}

function select(id) {
    state.sel = id;
    document.querySelectorAll('.st-node').forEach((g) => g.classList.toggle('sel', Number(g.dataset.id) === id));
    renderPanel();
}

function renderPanel(msg) {
    const box = $('.st-panel');
    const n = cfg.nodes.find((x) => x.id === state.sel);
    box.replaceChildren();
    box.style.setProperty('--c', n ? (TIER_COL[n.utier] || TIER_COL[0]) : '#ffcf5a');
    if (!n) { box.textContent = 'Click a skill to see what it does.'; return; }
    const col = TIER_COL[n.utier] || TIER_COL[0];
    const stateTxt = n.state === 'maxed' ? 'MAXED' : n.state === 'locked' ? 'LOCKED' : 'AVAILABLE';
    const info = document.createElement('div');
    info.className = 'st-info';
    const tag = n.gate ? `<span class="st-chip" style="color:${col};border-color:${col}">${TIER_NAME[n.utier]} unit unlock</span>` : `<span class="st-chip">${TIER_NAME[n.utier] || ''} skill</span>`;
    info.innerHTML = `<div class="st-state ${n.state}">${stateTxt}</div><h3>${esc(n.name)}</h3><p>${esc(n.desc)}</p><div class="st-pipsrow"><div class="st-pips"></div><small>Level ${n.level}/${n.max}</small>${tag}</div>`;
    const pips = info.querySelector('.st-pips');
    for (let i = 1; i <= n.max; i++) { const s = document.createElement('span'); s.className = 'st-pip' + (i <= n.level ? ' on' : ''); pips.appendChild(s); }
    const right = document.createElement('div');
    right.className = 'st-buywrap';
    const btn = document.createElement('button');
    btn.className = 'st-buy';
    btn.type = 'button';
    if (n.state === 'maxed') { btn.textContent = 'Max level'; btn.disabled = true; }
    else if (n.state === 'locked') { btn.textContent = n.needs; btn.disabled = true; btn.classList.add('lock'); }
    else {
        btn.innerHTML = `${n.level === 0 ? 'Unlock' : 'Upgrade'}<span class="st-cost"><i></i>${n.cost}</span>`;
        btn.disabled = cfg.souls < n.cost || state.busy;
        if (cfg.souls < n.cost) btn.title = 'Not enough souls';
    }
    btn.addEventListener('click', () => buy(n.id));
    right.appendChild(btn);
    box.append(info, right);
    if (msg) {
        const m = document.createElement('div');
        m.className = 'st-msg ' + msg[0];
        m.textContent = msg[1];
        right.appendChild(m);
    }
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

async function buy(id) {
    if (state.busy) return;
    state.busy = true;
    const fd = new FormData($('#st-csrf'));
    fd.set('skill_id', id);
    fd.set('ajax', '1');
    let msg;
    try {
        const res = await fetch(location.pathname, { method: 'POST', body: fd, headers: { 'X-Requested-With': 'fetch' } });
        const j = await res.json();
        if (j.csrf) $('#st-csrf').innerHTML = j.csrf;
        if (j.nodes) { cfg.nodes = j.nodes; cfg.souls = j.souls; $('.st-souls strong').textContent = j.souls; }
        msg = [j.ok ? 'ok' : 'err', j.message];
    } catch (e) {
        msg = ['err', 'Could not reach the server.'];
    }
    state.busy = false;
    await render(true);
    renderPanel(msg);
}

// ---------- tabs ----------
function renderTabs() {
    const tabs = $('.st-tabs');
    tabs.querySelectorAll('.st-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === state.tab));
    const gs = $('.st-groups');
    gs.replaceChildren();
    for (const g of cfg.groups.filter((x) => (state.tab === 'heroes') === (x.kind === 'hero'))) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'st-group' + (g.key === state.group ? ' on' : '');
        b.textContent = g.label;
        b.addEventListener('click', () => setGroup(g.key));
        gs.appendChild(b);
    }
}

function firstOpen() {
    const list = cfg.nodes.filter((n) => n.group === state.group);
    return (list.find((n) => n.state === 'open') || list[0] || {}).id || null;
}

async function setGroup(key) {
    state.group = key;
    state.sel = firstOpen();
    state.view = null;
    try { sessionStorage.setItem('stGroup', key); } catch (e) { /* storage may be blocked */ }
    renderTabs();
    await render();
}

function setTab(tab) {
    state.tab = tab;
    const list = cfg.groups.filter((x) => (tab === 'heroes') === (x.kind === 'hero'));
    setGroup(list[0].key);
}

// ---------- pan and zoom ----------
function initPanZoom() {
    let drag = null;
    svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, vx: state.view.x, vy: state.view.y, moved: false, id: e.pointerId }; });
    svg.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const k = state.view.w / svg.clientWidth;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 5) { drag.moved = true; svg.classList.add('drag'); try { svg.setPointerCapture(drag.id); } catch (err) { /* ignore */ } }
        if (!drag.moved) return;
        state.view.x = drag.vx - dx * k;
        state.view.y = drag.vy - dy * k;
        applyView();
    });
    const end = () => { if (drag && drag.moved) { justDragged = true; setTimeout(() => { justDragged = false; }, 0); } drag = null; svg.classList.remove('drag'); };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    const zoom = (f, cx, cy) => {
        const v = state.view;
        const px = cx === undefined ? v.x + v.w / 2 : cx, py = cy === undefined ? v.y + v.h / 2 : cy;
        const nw = Math.max(260, Math.min(2200, v.w * f)), nh = v.h * (nw / v.w);
        v.x = px - (px - v.x) * (nw / v.w);
        v.y = py - (py - v.y) * (nh / v.h);
        v.w = nw; v.h = nh;
        applyView();
    };
    svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const r = svg.getBoundingClientRect();
        const v = state.view;
        zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, v.x + ((e.clientX - r.left) / r.width) * v.w, v.y + ((e.clientY - r.top) / r.height) * v.h);
    }, { passive: false });
    svg.addEventListener('dblclick', () => { state.view = null; render(); });   // double-click empty space: reset the view
    let t = null;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { sizeStage(); state.view = null; render(); }, 150); });
}

// ---------- start ----------
// the stage fills everything below the site bar, with no gap underneath
function sizeStage() {
    const stage = $('.st-stage');
    stage.style.height = Math.max(420, window.innerHeight - stage.getBoundingClientRect().top - window.scrollY * 0) + 'px';
}

svg = el('svg', { xmlns: NS });
world = el('g', {}, svg);
$('.st-stage').prepend(svg);
sizeStage();
initPanZoom();
let start = null;
try { start = sessionStorage.getItem('stGroup'); } catch (e) { /* ignore */ }
if (!cfg.groups.find((g) => g.key === start)) start = cfg.groups[0].key;
state.tab = cfg.groups.find((g) => g.key === start).kind === 'hero' ? 'heroes' : 'units';
document.querySelectorAll('.st-tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
setGroup(start);