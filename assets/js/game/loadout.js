// loadout.js - visual loadout editor. Click a slot then a unit, or drag units onto the summon bar.
// It fills hidden <input name="slot[]"> fields, so the PHP save code (Loadout::save) is unchanged.
import { getUnitSheet } from './UnitArt.js';
import { rankSheet } from './RankArt.js';

const cfg = window.LOADOUT;
const SLOTS = cfg.slots;
const byId = new Map(cfg.units.map((u) => [u.id, u]));
const LINES = ['miner', 'swordsman', 'archer', 'mage', 'healer'];
const TIER_NAMES = ['Base', 'Elite', 'Godly'];

let slots = Array.from({ length: SLOTS }, (_, i) => cfg.current[i] || 0);
let selected = 0;
let dirty = false;
let atlas = null;
let atlasImg = null;

const $ = (id) => document.getElementById(id);

// ---- sprites: same lookup as the game (hand-drawn units.png first, then the generated art) ----

async function loadAtlas() {
    try {
        const res = await fetch(cfg.baseUrl + '/assets/sprites/units/units.json');
        atlas = await res.json();
        atlasImg = await new Promise((ok, fail) => {
            const im = new Image();
            im.onload = () => ok(im);
            im.onerror = fail;
            im.src = cfg.baseUrl + '/assets/sprites/units/units.png';
        });
    } catch (e) {
        atlas = null;
        atlasImg = null;
    }
}

function drawSprite(canvas, u) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let spot = atlas && atlas.units && atlas.units[u.sprite];
    let source = atlasImg;
    let cell = atlas ? atlas.cell : 32;
    if (!spot) {
        const gen = getUnitSheet();
        spot = gen.units[u.sprite];
        source = gen.canvas;
        cell = gen.cell;
    }
    canvas.width = cell;
    canvas.height = cell;
    if (!spot || !source) {                                   // no art yet: coloured circle with the first letter
        ctx.fillStyle = '#6a5acd';
        ctx.beginPath(); ctx.arc(cell / 2, cell / 2, cell / 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = (cell / 2) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(u.name[0], cell / 2, cell / 2 + cell / 6);
        return;
    }
    if (u.tier > 0) source = rankSheet(source, cell, u.tier);      // Elite / Godly look
    ctx.drawImage(source, spot.right[0] * cell, spot.right[1] * cell, cell, cell, 0, 0, cell, cell);
}

function spriteCanvas(u) {
    const c = document.createElement('canvas');
    c.className = 'lo-sprite';
    drawSprite(c, u);
    return c;
}

// ---- state helpers ----

function place(unitId, index) {
    slots = slots.map((id) => (id === unitId ? 0 : id));      // a unit can only be in the bar once
    slots[index] = unitId;
    touch();
}

function touch() {
    dirty = true;
    render();
}

function nextFree(from) {
    for (let k = 1; k <= SLOTS; k++) {
        const i = (from + k) % SLOTS;
        if (!slots[i]) return i;
    }
    return Math.min(SLOTS - 1, from + 1);
}

// ---- rendering ----

function keyLabel(i) { return i === 9 ? '0' : String(i + 1); }

function renderBar() {
    const bar = $('lo-bar');
    bar.innerHTML = '';
    slots.forEach((id, i) => {
        const u = id ? byId.get(id) : null;
        const el = document.createElement('div');
        el.className = 'lo-slot' + (i === selected ? ' sel' : '') + (u ? ' filled tier' + u.tier : '');
        el.dataset.index = i;
        el.draggable = !!u;
        el.innerHTML = '<span class="lo-key">' + keyLabel(i) + '</span>';
        if (u) {
            el.appendChild(spriteCanvas(u));
            const name = document.createElement('span');
            name.className = 'lo-name';
            name.textContent = u.name;
            const cost = document.createElement('span');
            cost.className = 'lo-cost';
            cost.textContent = u.cost + 'g';
            const x = document.createElement('button');
            x.type = 'button';
            x.className = 'lo-x';
            x.title = 'Remove from bar';
            x.textContent = '×';
            x.addEventListener('click', (e) => { e.stopPropagation(); slots[i] = 0; selected = i; touch(); });
            el.append(name, cost, x);
        } else {
            const e = document.createElement('span');
            e.className = 'lo-empty';
            e.textContent = '+';
            el.appendChild(e);
        }
        el.addEventListener('click', () => { selected = i; render(); });
        el.addEventListener('dragstart', (ev) => { ev.dataTransfer.setData('text/plain', 's:' + i); });
        el.addEventListener('dragover', (ev) => { ev.preventDefault(); el.classList.add('over'); });
        el.addEventListener('dragleave', () => el.classList.remove('over'));
        el.addEventListener('drop', (ev) => {
            ev.preventDefault();
            el.classList.remove('over');
            const [kind, val] = String(ev.dataTransfer.getData('text/plain')).split(':');
            if (kind === 'u') { place(parseInt(val, 10), i); selected = nextFree(i); render(); }
            else if (kind === 's') {
                const from = parseInt(val, 10);
                [slots[from], slots[i]] = [slots[i], slots[from]];
                selected = i;
                touch();
            }
        });
        bar.appendChild(el);
    });
}

function renderUnits() {
    const root = $('lo-units');
    root.innerHTML = '';
    const lines = [...new Set([...LINES, ...cfg.units.map((u) => u.line)])];
    for (const line of lines) {
        const group = cfg.units.filter((u) => u.line === line).sort((a, b) => a.tier - b.tier);
        if (!group.length) continue;
        const row = document.createElement('div');
        row.className = 'lo-line';
        const title = document.createElement('h3');
        title.textContent = line.charAt(0).toUpperCase() + line.slice(1).replace('_', ' ');
        const cards = document.createElement('div');
        cards.className = 'lo-cards';
        for (const u of group) {
            const inBar = slots.includes(u.id);
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'lo-card tier' + u.tier + (u.locked ? ' locked' : '') + (inBar ? ' used' : '');
            card.disabled = u.locked;
            card.draggable = !u.locked;
            card.title = u.locked ? 'Locked: unlock it in the skill tree'
                : u.name + ' - HP ' + u.hp + ', damage ' + u.damage;
            card.appendChild(spriteCanvas(u));
            const name = document.createElement('span');
            name.className = 'lo-name';
            name.textContent = u.name;
            const meta = document.createElement('span');
            meta.className = 'lo-meta';
            meta.textContent = u.locked ? '🔒 Locked' : TIER_NAMES[u.tier] + ' · ' + u.cost + 'g';
            const txt = document.createElement('span');
            txt.className = 'lo-txt';
            txt.append(name, meta);
            card.appendChild(txt);
            if (inBar) {
                const tag = document.createElement('span');
                tag.className = 'lo-tag';
                tag.textContent = 'slot ' + keyLabel(slots.indexOf(u.id));
                card.appendChild(tag);
            }
            if (!u.locked) {
                card.addEventListener('click', () => { place(u.id, selected); selected = nextFree(selected); render(); });
                card.addEventListener('dragstart', (ev) => { ev.dataTransfer.setData('text/plain', 'u:' + u.id); });
            }
            cards.appendChild(card);
        }
        row.append(title, cards);
        root.appendChild(row);
    }
}

function renderHidden() {
    const box = $('lo-hidden');
    box.innerHTML = '';
    slots.forEach((id) => {
        const inp = document.createElement('input');
        inp.type = 'hidden';
        inp.name = 'slot[]';
        inp.value = String(id);
        box.appendChild(inp);
    });
}

function render() {
    renderBar();
    renderUnits();
    renderHidden();
    $('lo-count').textContent = slots.filter(Boolean).length + ' / ' + SLOTS + ' slots';
    $('lo-dirty').hidden = !dirty;
}

// ---- buttons and keys ----

$('lo-clear').addEventListener('click', () => { slots = slots.map(() => 0); selected = 0; touch(); });
$('lo-default').addEventListener('click', () => {
    slots = Array.from({ length: SLOTS }, (_, i) => cfg.defaults[i] || 0);
    selected = 0;
    touch();
});
$('loadout-form').addEventListener('submit', () => { dirty = false; });
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if (/^[0-9]$/.test(e.key)) { selected = e.key === '0' ? 9 : parseInt(e.key, 10) - 1; render(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { slots[selected] = 0; touch(); }
});

await loadAtlas();
render();