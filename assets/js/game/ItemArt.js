// ItemArt.js - item icons for the hero loadout, drawn in code (24x24 pixel art, scaled to any size).
// Signature stays compatible: drawItemIcon(ctx, x, y, size, slot, rarity)   - old calls keep working.
// Pass the item name (and a time in ms for the shimmer) to get the exact artwork for that item:
//     drawItemIcon(ctx, x, y, size, slot, rarity, name, performance.now())
// Every rarity has its own look; names with Frost / Ember / Void / Storm / Jade / Blood / Sun... recolour the accent.
export const RARITY_COLORS = {
    common: '#c8cdd6', uncommon: '#5fe07a', rare: '#4aa3ff', epic: '#b06bff', legendary: '#ffa020', mythical: '#ff5ad2',
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];

const OUT = '#0c0a1a';
// ---------- tiny pixel pen ----------
function pen(g) {
    const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const dot = (x, y, c) => P(x, y, 1, 1, c);
    const disc = (cx, cy, r, c, cut) => {
        g.fillStyle = c;
        for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
            const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
            if (dx * dx + dy * dy <= r * r && !(cut && cut(x, y))) g.fillRect(x, y, 1, 1);
        }
    };
    const line = (x0, y0, x1, y1, c) => {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= n; i++) dot(Math.round(x0 + (x1 - x0) * i / (n || 1)), Math.round(y0 + (y1 - y0) * i / (n || 1)), c);
    };
    return { P, dot, disc, line };
}
function outline(g) {                           // 1px dark outline around everything drawn
    const im = g.getImageData(0, 0, 24, 24), d = im.data, o = new Uint8ClampedArray(d);
    const a = (x, y) => (x < 0 || y < 0 || x > 23 || y > 23) ? 0 : d[(y * 24 + x) * 4 + 3];
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
        if (a(x, y) > 0) continue;
        if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) {
            const i = (y * 24 + x) * 4; o[i] = 12; o[i + 1] = 10; o[i + 2] = 26; o[i + 3] = 255;
        }
    }
    g.putImageData(new ImageData(o, 24, 24), 0, 0);
}
const hsl = (h, s, l) => `hsl(${h % 360},${s}%,${l}%)`;

// ---------- palettes ----------
const METAL = {            // [dark, mid, light]
    common: ['#4a3a30', '#8a6a52', '#c8a888'], uncommon: ['#5a6680', '#a4aec4', '#e8f0fc'], rare: ['#2f4f94', '#5f98e0', '#d4ebff'],
    epic: ['#2a1650', '#6a3ab8', '#d8a8ff'], legendary: ['#a04a10', '#ffa020', '#fff2a8'], mythical: ['#7ad8ff', '#ffffff', '#ff9af0'],
};
const ELEM = [   // [pattern, [dark, mid, light]]
    [/frost|ice|glacier|winter/i, ['#2a6ac0', '#6ad0ff', '#e6fbff']],
    [/ember|flame|fire|phoenix|sun|dragon/i, ['#b03010', '#ff7a2a', '#ffe08a']],
    [/void|shadow|obsidian|dread|wraith|eclipse/i, ['#2a0a4a', '#8a3ae0', '#e0a8ff']],
    [/storm|thunder|spark/i, ['#2a60b0', '#ffe84a', '#ffffff']],
    [/jade|hunt|scout|sage/i, ['#1a7a40', '#4ae080', '#d0ffe0']],
    [/blood|rosary|heart|soul/i, ['#8a0a24', '#ff3a5a', '#ffb0bc']],
    [/star|dawn|aegis|archon|celestial|aeon|crown/i, ['#2a8ad0', '#7affff', '#ffffff']],
];
function accentFor(name, rarity) {
    for (const [re, pal] of ELEM) if (re.test(name || '')) return pal;
    return { common: ['#6a5a50', '#a89078', '#d8c8b0'], uncommon: ['#1a7a40', '#4ae080', '#d0ffe0'], rare: ['#2a6ac0', '#6ad0ff', '#e6fbff'],
        epic: ['#6a1ab0', '#c07aff', '#f4dcff'], legendary: ['#c04a00', '#ff9a20', '#fff0a0'], mythical: ['#ff5ad2', '#7affff', '#ffffff'] }[rarity];
}

// ---------- weapons ----------
function blade(p, o) {                  // diagonal blade from the hilt (7,16) up-right
    const { len, m, ac, wide, fuller, fn } = o;
    for (let i = 0; i < len; i++) {
        const x = 8 + i, y = 15 - i;
        const c = fn ? fn(i) : null;
        p.dot(x - 1, y, c || m[2]); p.dot(x, y, c || m[1]); p.dot(x + 1, y, c || (wide ? m[1] : m[0]));
        if (wide) p.dot(x + 2, y, m[0]);
        if (fuller && i > 1 && i < len - 2) p.dot(x, y, ac[1]);
    }
    p.dot(8 + len, 15 - len, m[2]); p.dot(7 + len, 15 - len, m[2]);
}
function hilt(p, o) {
    const { guard, grip, pommel } = o;
    for (let k = -(o.gw || 3); k <= (o.gw || 3); k++) p.dot(7 + k, 16 + k, guard);
    p.dot(7 + (o.gw || 3) + 0, 16 + (o.gw || 3) - 1, guard);
    p.dot(6, 17, grip); p.dot(5, 18, grip); p.dot(7, 17, grip); p.dot(6, 18, grip); p.dot(4, 19, grip);
    p.disc(3.6, 20.4, 1.9, pommel);
    if (o.gem) p.dot(7, 16, o.gem);
}
function weapon(g, name, rarity) {
    const p = pen(g), m = METAL[rarity], ac = accentFor(name, rarity);
    const n = (name || '').toLowerCase();
    const wood = '#6a3e1c', gold = '#ffd84a';
    if (/cleaver|\baxe/.test(n) || (!name && rarity === 'epic')) {               // axe / cleaver
        p.line(4, 20, 17, 7, rarity === 'mythical' ? '#fff' : wood); p.line(5, 20, 18, 7, rarity === 'mythical' ? '#9af0ff' : '#8a5a2c');
        p.line(3, 21, 5, 19, '#2a1a10');
        const cut = (x, y) => (x - 21) * (x - 21) + (y - 3) * (y - 3) < 17;
        p.disc(15, 8, 6.4, m[1], cut);
        p.disc(15, 8, 6.4, m[0], (x, y) => cut(x, y) || (x + y < 22));
        for (let i = 0; i < 6; i++) p.dot(10 + i, 12 - i - 1 + (i > 4 ? 1 : 0), m[2]);
        p.dot(14, 6, ac[2]); p.dot(13, 7, ac[1]); p.dot(12, 8, ac[1]);
        if (rarity === 'epic' || rarity === 'mythical') { p.dot(10, 10, ac[1]); p.dot(11, 11, ac[2]); }
        return;
    }
    if (/club|hammer/.test(n)) {                                                        // club
        for (let i = 0; i < 14; i++) { const w = i > 7 ? 2 : 1; p.P(5 + i - (w - 1), 19 - i, w + 1, 1, i > 7 ? '#8a5a2c' : '#6a3e1c'); }
        p.dot(14, 9, '#c8c8c8'); p.dot(16, 8, '#c8c8c8'); p.dot(13, 12, '#c8c8c8'); p.dot(18, 6, '#a8a8a8');
        p.line(3, 21, 5, 19, '#3a2a18'); p.P(4, 19, 2, 1, '#b08a50');
        return;
    }
    const dag = /knife|dagger|fang/.test(n);
    const sab = /saber/.test(n);
    const o = {
        len: dag ? 6 : (rarity === 'common' ? 8 : rarity === 'uncommon' ? 9 : rarity === 'mythical' ? 12 : 11),
        m: rarity === 'common' ? METAL.common : m, ac, wide: rarity === 'legendary' || rarity === 'mythical' || sab,
        fuller: rarity !== 'common' && rarity !== 'uncommon' && !dag,
    };
    if (rarity === 'mythical') o.fn = (i) => hsl(170 + i * 16, 90, 78);
    if (rarity === 'common') { o.fuller = false; }
    blade(p, o);
    hilt(p, {
        guard: rarity === 'common' ? '#6a5a50' : rarity === 'uncommon' ? '#8a7a68' : rarity === 'rare' || rarity === 'legendary' ? gold : rarity === 'epic' ? '#4a2a7a' : '#ffffff',
        grip: rarity === 'common' ? wood : rarity === 'uncommon' ? '#5a3a1c' : rarity === 'epic' ? '#2a1648' : rarity === 'mythical' ? '#c8f4ff' : '#4a2a14',
        pommel: rarity === 'common' ? '#6a5a50' : (rarity === 'rare' || rarity === 'legendary') ? gold : ac[1],
        gem: (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') ? ac[1] : null, gw: dag ? 2 : 3,
    });
    if (rarity === 'common') {                                                           // rust / chips
        p.dot(11, 12, '#6a3a22'); p.dot(13, 10, '#6a3a22'); p.dot(10, 13, '#5a3220');
    }
    if (rarity === 'legendary') {                                                        // flames licking the blade
        [[11, 9], [13, 6], [15, 5], [9, 11], [16, 8], [17, 5]].forEach(([x, y], i) => { p.dot(x, y, ac[i % 2 ? 2 : 1]); p.dot(x, y - 1, ac[0]); });
        p.P(2, 17, 1, 1, ac[1]);
    }
    if (rarity === 'epic') { p.dot(12, 10, ac[2]); p.dot(14, 8, ac[2]); p.dot(10, 12, ac[2]); }
    if (rarity === 'mythical') {                                                         // floating star shards
        p.P(19, 8, 1, 3, '#fff'); p.P(18, 9, 3, 1, '#fff'); p.P(5, 8, 1, 3, '#7affff'); p.P(4, 9, 3, 1, '#7affff');
        p.dot(20, 14, '#ff9af0'); p.dot(3, 14, '#fff');
    }
}

// ---------- armour ----------
const HW = { 4: 4, 5: 6, 6: 7, 7: 7, 8: 6, 9: 6, 10: 6, 11: 6, 12: 6, 13: 6, 14: 6, 15: 7, 16: 7, 17: 7, 18: 6, 19: 5 };
function armor(g, name, rarity) {
    const p = pen(g), m = METAL[rarity], ac = accentFor(name, rarity), n = (name || '').toLowerCase();
    const cloth = /cloak|mantle|wraith|weave|tunic|wrap|robe/.test(n);
    const base = rarity === 'common' ? ['#4a3a28', '#8a6a42', '#b8905a'] : rarity === 'uncommon' ? ['#4a2c18', '#8a5a30', '#c08850'] : m;
    const [dk, md, lt] = base;
    // torso, row by row: lit left, shaded right
    for (const y in HW) {
        const hw = HW[y], x0 = 12 - hw, x1 = 12 + hw - 1;
        for (let x = x0; x <= x1; x++) p.dot(x, +y, x <= x0 + 1 ? lt : x >= x1 - 1 ? dk : md);
    }
    p.P(10, 4, 4, 2, OUT);                                                              // neck hole
    p.P(10, 6, 4, 1, dk);
    // pauldrons / shoulders
    if (!cloth && rarity !== 'common') {
        const s = rarity === 'epic' ? 'spike' : 'round';
        for (const side of [-1, 1]) {
            const cx = side < 0 ? 4 : 19;
            p.disc(cx, 8, 3.2, md); p.disc(cx - 0.6, 7.4, 2, lt); p.P(cx - 2, 10, 5, 1, dk);
            if (s === 'spike') { p.P(cx - 1 + (side > 0 ? 1 : 0), 3, 1, 3, ac[2]); p.dot(cx + (side > 0 ? 1 : -1) - (side > 0 ? 0 : 0), 2, ac[2]); }
        }
    } else {
        p.P(3, 6, 4, 3, md); p.P(17, 6, 4, 3, dk); p.P(3, 6, 4, 1, lt);                 // sleeves
        p.P(3, 9, 3, 3, lt); p.P(18, 9, 3, 3, md);
    }
    // belt
    p.P(6, 14, 12, 1, '#2a1a10'); p.P(11, 14, 2, 1, '#ffd84a');
    // per-tier pattern
    if (rarity === 'common') {                                                           // patches + stitches
        p.P(8, 8, 3, 3, '#a8704a'); p.dot(8, 8, '#5a3a22'); p.dot(10, 10, '#5a3a22'); p.P(14, 16, 3, 2, '#6a8a5a'); p.dot(14, 16, '#3a4a30');
        p.line(12, 7, 12, 13, '#5a3a22');
    } else if (rarity === 'uncommon') {                                                  // leather straps
        p.line(8, 7, 15, 13, '#2a1a10'); p.line(15, 7, 8, 13, '#2a1a10'); p.dot(12, 10, '#ffd84a');
        p.P(6, 17, 12, 1, '#2a1a10'); p.dot(9, 17, '#c8c8c8'); p.dot(14, 17, '#c8c8c8');
    } else if (rarity === 'rare') {                                                      // chain links + blue trim
        for (let y = 7; y < 19; y++) for (let x = 6; x < 18; x++) if (y !== 14 && (x + y) % 2 === 0 && HW[y] && Math.abs(x - 11.5) < HW[y] - 0.5) p.dot(x, y, y % 4 < 2 ? lt : md);
        p.P(11, 6, 2, 8, ac[1]); p.P(11, 6, 1, 8, ac[2]); p.P(6, 19, 12, 1, ac[0]);
    } else if (rarity === 'epic') {                                                      // plate ridge, rivets, runes
        p.P(11, 6, 2, 8, dk); p.P(11, 6, 1, 8, md);
        for (const [x, y] of [[7, 8], [16, 8], [7, 12], [16, 12], [8, 17], [15, 17]]) p.dot(x, y, ac[2]);
        p.P(11, 16, 2, 3, ac[1]); p.dot(11, 16, ac[2]); p.P(6, 19, 12, 1, dk);
        p.line(8, 10, 10, 12, ac[1]); p.line(15, 10, 13, 12, ac[1]);
    } else if (rarity === 'legendary') {                                                 // dragon scales + gold trim
        for (let y = 7; y < 20; y += 2) for (let x = 6 + (y % 4 ? 0 : 1); x < 18; x += 2) {
            if (y === 14 || !HW[y] || Math.abs(x - 11.5) >= HW[y] - 0.5) continue;
            p.dot(x, y, lt); p.dot(x, y + 1, dk);
        }
        p.P(11, 5, 2, 9, '#ffd84a'); p.P(6, 19, 12, 1, '#ffd84a'); p.dot(12, 9, ac[2]); p.dot(12, 10, ac[1]);
        for (const x of [5, 8, 15, 18]) p.dot(x, 4, '#ffd84a');
    } else {                                                                             // mythical: ethereal plate, floating wings of light
        for (let y = 5; y < 19; y++) for (let x = 5; x < 19; x++) if (HW[y] && Math.abs(x - 11.5) < HW[y] && (x + y) % 3 === 0) p.dot(x, y, hsl(170 + (x + y) * 12, 90, 82));
        p.P(11, 5, 2, 13, '#ffffff'); p.disc(12, 10, 2.2, '#7affff'); p.disc(12, 10, 1.1, '#ffffff');
        for (const side of [-1, 1]) { const x = side < 0 ? 0 : 20; p.P(x, 8, 3, 1, '#7affff'); p.P(x + (side < 0 ? 0 : 1), 10, 2, 1, '#ff9af0'); p.P(x + (side < 0 ? 1 : 0), 12, 2, 1, '#ffffff'); p.dot(x + 1, 5, '#fff'); }
        p.P(6, 19, 12, 1, '#ff9af0');
    }
    if (cloth && rarity !== 'common' && rarity !== 'mythical') {                         // hooded cloak drape
        p.P(10, 5, 4, 1, dk); p.P(9, 18, 6, 2, dk); p.dot(12, 6, ac[1]);
    }
}

// ---------- trinkets ----------
function trinket(g, name, rarity) {
    const p = pen(g), m = METAL[rarity], ac = accentFor(name, rarity), n = (name || '').toLowerCase();
    const gold = '#ffd84a', goldD = '#b8860b';
    const ring = (cx, cy, r, c, c2) => { p.disc(cx, cy, r, c); p.disc(cx, cy, r - 1.7, 'rgba(0,0,0,0)'); g.clearRect(0, 0, 0, 0); };
    let kind = /coin/.test(n) ? 'coin' : /whistle/.test(n) ? 'whistle' : /feather/.test(n) ? 'feather' : /crown/.test(n) ? 'crown'
        : /eye|archon/.test(n) ? 'eye' : /ring|signet/.test(n) ? 'ring' : /charm/.test(n) ? 'charm' : /locket/.test(n) ? 'locket'
        : /shard|stone|crystal/.test(n) ? 'crystal' : /moon|amulet|pendant|rosary/.test(n) ? 'amulet' : /heart/.test(n) ? 'heart' : null;
    if (!kind) kind = { common: 'charm', uncommon: 'ring', rare: 'crystal', epic: 'amulet', legendary: 'heart', mythical: 'eye' }[rarity];
    const chain = (c) => { p.line(7, 2, 11, 8, c); p.line(16, 2, 12, 8, c); p.line(8, 2, 11, 7, c); p.line(15, 2, 12, 7, c); };
    if (kind === 'charm') {                                                              // wooden bead on a cord
        p.line(8, 2, 11, 8, '#c8a878'); p.line(15, 2, 12, 8, '#c8a878');
        p.disc(12, 14, 6, '#5a3414'); p.disc(11.5, 13.5, 5, '#8a5a2c'); p.disc(10.5, 12.5, 2.4, '#b8844a');
        p.line(9, 15, 15, 11, '#4a2a10'); p.dot(12, 17, '#4a2a10'); p.P(11, 8, 2, 2, '#c8a878');
        p.P(14, 18, 2, 2, ac[1]); p.dot(8, 18, '#6a8a4a');
    } else if (kind === 'coin') {
        p.disc(12, 12, 8, goldD); p.disc(11.6, 11.6, 7, gold); p.disc(11, 11, 4.6, '#ffe98a'); p.disc(11, 11, 3.4, gold);
        p.P(11, 8, 2, 7, '#c8941a'); p.P(9, 10, 6, 1, '#c8941a'); p.dot(8, 7, '#fff8c0'); p.dot(9, 6, '#fff8c0');
    } else if (kind === 'whistle') {
        p.line(6, 4, 9, 8, '#c8a878'); p.line(7, 4, 10, 8, '#c8a878');
        p.P(8, 9, 12, 5, '#e8e0c8'); p.P(8, 9, 12, 1, '#fff8e8'); p.P(8, 13, 12, 1, '#b8b098'); p.P(16, 10, 3, 3, '#2a2018'); p.P(18, 11, 4, 1, '#2a2018');
        p.dot(10, 11, '#b8b098'); p.dot(13, 11, '#b8b098'); p.disc(7, 11, 2.4, '#e8e0c8'); p.dot(6, 10, '#fff8e8');
    } else if (kind === 'ring') {
        const jade = /jade/.test(n), cop = /copper/.test(n);
        const band = cop ? ['#8a4a20', '#d88848', '#ffd0a0'] : [m[0], m[1], m[2]];
        p.disc(12, 14.5, 7.4, band[1]); p.disc(12, 14.5, 5.2, 'rgba(0,0,0,1)');
        g.save(); g.globalCompositeOperation = 'destination-out'; p.disc(12, 14.5, 5, '#000'); g.restore();
        p.dot(7, 11, band[2]); p.dot(8, 10, band[2]); p.dot(6, 13, band[2]); p.P(9, 20, 6, 1, band[0]); p.P(16, 18, 2, 2, band[0]);
        p.disc(12, 6.5, 3.2, band[0]); p.disc(12, 6.2, 2.4, jade ? '#4ae080' : cop ? '#d84a4a' : ac[1]); p.dot(11, 5, '#fff');
    } else if (kind === 'crystal') {
        const col = ac;
        for (let y = 2; y < 22; y++) {
            const hw = y < 9 ? 1 + (y - 2) * 0.75 : Math.max(0.5, 6.2 - (y - 9) * 0.5);
            for (let x = 0; x < 24; x++) { const dx = x + 0.5 - 12; if (Math.abs(dx) < hw) p.dot(x, y, dx < -hw * 0.35 ? col[2] : dx > hw * 0.35 ? col[0] : col[1]); }
        }
        p.line(10, 6, 9, 11, '#ffffff'); p.dot(9, 12, '#ffffff'); p.P(12, 9, 1, 6, col[2]);
        p.dot(4, 6, col[2]); p.dot(19, 14, col[2]); p.dot(18, 5, '#fff');
    } else if (kind === 'amulet') {
        chain('#9aa6bd');
        p.disc(12, 14, 6.8, gold); p.disc(12, 14, 5.4, '#1b1432');
        const moon = !/pendant|rosary/.test(n);
        if (moon) { p.disc(11, 14, 4.2, ac[2]); p.disc(13.4, 12.6, 3.8, '#1b1432'); p.dot(15, 17, ac[1]); p.dot(16, 14, '#fff'); }
        else { p.disc(12, 14, 3.4, ac[1]); p.disc(11, 13, 1.4, ac[2]); }
        p.dot(7, 11, '#fff2a0'); p.P(11, 7, 2, 2, goldD);
    } else if (kind === 'locket') {
        chain('#c8a060'); p.disc(12, 14.5, 6.6, goldD); p.disc(11.6, 14, 5.6, gold); p.disc(12, 14, 3.6, ac[0]); p.disc(11.4, 13.4, 2.4, ac[1]); p.dot(10, 12, ac[2]);
        p.P(11, 7, 2, 2, goldD);
    } else if (kind === 'heart') {
        const hr = (cx, cy, c) => { g.fillStyle = c; for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
            const u = (x + 0.5 - cx) / 6.4, v = -(y + 0.5 - cy) / 6.4; const k = u * u + v * v - 1; if (k * k * k - u * u * v * v * v <= 0) g.fillRect(x, y, 1, 1); } };
        hr(12, 14, '#b8860b'); hr(12, 13.6, gold); g.save(); g.translate(0, 0.5);
        hr(12, 14, ac[0]); hr(11.8, 13.4, ac[1]); g.restore();
        p.P(8, 9, 2, 2, ac[2]); p.dot(7, 11, '#fff'); p.dot(14, 5, gold); p.dot(9, 5, gold); p.P(11, 20, 2, 2, goldD);
        p.dot(12, 3, '#fff0a0'); p.dot(5, 9, '#fff0a0'); p.dot(19, 10, '#fff0a0');
    } else if (kind === 'feather') {
        for (let i = 0; i < 17; i++) {
            const x = 6 + i * 0.75, y = 20 - i, w = i < 3 ? 1 : i > 13 ? 3 - (i - 13) * 0.6 : 3.4;
            for (let k = -Math.floor(w); k <= Math.floor(w); k++) p.dot(Math.round(x + k), y, k < 0 ? ac[2] : k > 1 ? ac[0] : ac[1]);
        }
        p.line(5, 21, 18, 4, '#fff2c8'); p.dot(10, 8, ac[2]); p.dot(14, 11, ac[2]);
    } else if (kind === 'crown') {
        p.P(5, 14, 14, 5, gold); p.P(5, 14, 14, 1, '#fff2a0'); p.P(5, 18, 14, 1, goldD);
        for (const [x, h] of [[5, 6], [9, 9], [11, 11], [15, 9], [18, 6]]) { p.P(x, 14 - h + 3, 2, h - 2, gold); p.dot(x, 14 - h + 3, '#fff2a0'); }
        p.P(11, 6, 2, 8, gold);
        for (const [x, y, c] of [[6, 15, '#ff5ad2'], [11, 15, '#7affff'], [17, 15, '#ff5ad2'], [11, 5, '#ffffff'], [5, 9, '#7affff'], [18, 9, '#7affff']]) p.P(x, y, 2, 2, c);
        p.P(6, 17, 12, 1, '#fff'); p.dot(3, 4, '#fff'); p.dot(20, 4, '#fff');
    } else if (kind === 'eye') {                                                         // mythical orb with eye + orbit ring
        p.disc(12, 12, 8, '#2a1a5a'); p.disc(12, 12, 7, '#4a2a9a'); p.disc(11, 11, 5.4, '#7a5ae0');
        for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const dx = (x + .5 - 12) / 6.6, dy = (y + .5 - 12) / 3.6; if (dx * dx + dy * dy <= 1) p.dot(x, y, '#ffffff'); }
        p.disc(12, 12, 3, '#7affff'); p.disc(12, 12, 1.6, '#12102a'); p.dot(11, 11, '#fff');
        for (let a = 0; a < 40; a++) { const t = a / 40 * 6.283; const x = Math.round(12 + Math.cos(t) * 11), y = Math.round(12 + Math.sin(t) * 4 + Math.cos(t) * 3); if (x > 0 && x < 23 && y > 0 && y < 23) p.dot(x, y, hsl(170 + a * 8, 90, 70)); }
        p.dot(3, 4, '#fff'); p.dot(20, 19, '#fff');
    }
}

// ---------- composition ----------
const cache = new Map();
function art(slot, rarity, name) {
    const key = slot + '|' + rarity + '|' + (name || '');
    let c = cache.get(key);
    if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 24;
    const g = c.getContext('2d', { willReadFrequently: true });
    (slot === 'weapon' ? weapon : slot === 'armor' ? armor : trinket)(g, name || '', RARITY_COLORS[rarity] ? rarity : 'common');
    outline(g);
    cache.set(key, c);
    return c;
}

// Draws the icon (frame + backdrop + art) into a size x size square with its top-left corner at (x, y)
export function drawItemIcon(ctx, x, y, size, slot, rarity, name, t) {
    if (!RARITY_COLORS[rarity]) rarity = 'common';
    const col = RARITY_COLORS[rarity], tier = RARITY_ORDER.indexOf(rarity), now = (t === undefined ? 0 : t);
    const s = size / 24, bw = Math.max(1, Math.round(size / 16));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // backdrop: dark with a rarity-coloured glow behind the item
    ctx.fillStyle = '#100e26'; ctx.fillRect(x, y, size, size);
    const rg = ctx.createRadialGradient(x + size / 2, y + size * 0.55, 0, x + size / 2, y + size * 0.55, size * 0.75);
    rg.addColorStop(0, col + (tier >= 4 ? '88' : tier >= 2 ? '55' : '2a')); rg.addColorStop(1, 'rgba(16,14,38,0)');
    ctx.fillStyle = rg; ctx.fillRect(x, y, size, size);
    if (tier === 5) {                                                                    // mythical: slowly rotating prism wash
        const h = (now / 20) % 360, pg = ctx.createLinearGradient(x, y, x + size, y + size);
        pg.addColorStop(0, `hsla(${h},90%,60%,.28)`); pg.addColorStop(0.5, 'rgba(0,0,0,0)'); pg.addColorStop(1, `hsla(${h + 120},90%,60%,.28)`);
        ctx.fillStyle = pg; ctx.fillRect(x, y, size, size);
    }
    // the art (soft glow for epic and above)
    if (tier >= 3 && size >= 24) { ctx.shadowColor = col; ctx.shadowBlur = size * (tier >= 4 ? 0.22 : 0.14); }
    const pad = size >= 32 ? Math.round(size * 0.06) : 0;
    ctx.drawImage(art(slot, rarity, name), x + pad, y + pad, size - pad * 2, size - pad * 2);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    // twinkles
    if (tier >= 3) {
        const n = tier - 1;
        for (let i = 0; i < n; i++) {
            const ph = ((now / 700) + i * 0.37) % 1, a = Math.sin(ph * Math.PI);
            const sx = x + ((i * 7 + 4) % 20 + 2) * s, sy = y + ((i * 11 + 3) % 18 + 2) * s;
            ctx.globalAlpha = a * (t === undefined ? 0.7 : 1); ctx.fillStyle = '#fff';
            const r = Math.max(1, Math.round(s * (1 + a)));
            ctx.fillRect(Math.round(sx), Math.round(sy - r), Math.max(1, Math.round(s * 0.6)), r * 2);
            ctx.fillRect(Math.round(sx - r), Math.round(sy), r * 2, Math.max(1, Math.round(s * 0.6)));
        }
        ctx.globalAlpha = 1;
    }
    // frame
    if (tier === 5) { ctx.strokeStyle = `hsl(${(now / 12) % 360},95%,65%)`; }
    else ctx.strokeStyle = col;
    ctx.lineWidth = bw; ctx.strokeRect(x + bw / 2, y + bw / 2, size - bw, size - bw);
    if (tier >= 4) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, bw / 2); ctx.strokeRect(x + bw * 1.5, y + bw * 1.5, size - bw * 3, size - bw * 3); }
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9;
    if (tier >= 2) { const c = Math.max(1, bw); ctx.fillStyle = col; ctx.globalAlpha = 1; [[0, 0], [size - c * 2, 0], [0, size - c * 2], [size - c * 2, size - c * 2]].forEach(([a, b]) => ctx.fillRect(x + a, y + b, c * 2, c * 2)); }
    ctx.restore();
}