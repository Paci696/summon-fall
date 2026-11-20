<?php
// Admin-only catalog: every unit, skill, hero and item on one page. Hover (or tap) a tile to see its stats.
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

$db = Database::getInstance();
$error = '';
$sections = ['units' => [], 'skills' => [], 'heroes' => [], 'items' => []];
try {
    $units = $db->fetchAll('SELECT * FROM units ORDER BY id');
    $skills = $db->fetchAll('SELECT * FROM skills ORDER BY branch, tier, id');
    $heroes = $db->fetchAll('SELECT * FROM heroes ORDER BY id');
    $abil = $db->fetchAll('SELECT * FROM hero_abilities ORDER BY hero_id, slot');
    $items = $db->fetchAll("SELECT * FROM items ORDER BY FIELD(rarity,'mythical','legendary','epic','rare','uncommon','common'), slot, id");
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load the catalog.';
    $units = $skills = $heroes = $abil = $items = [];
}
$unitName = array_column($units, 'name', 'id');
$heroName = array_column($heroes, 'name', 'id');
$abBy = [];
foreach ($abil as $a) { $abBy[$a['hero_id']][] = $a; }

// Turn a DB row into [label => value] for the tooltip (blank / null columns are skipped)
$skip = ['name', 'description', 'created_at', 'updated_at', 'sprite_key'];
$pack = function (array $r, string $type) use ($skip, $unitName, $heroName, $abBy): array {
    $stats = [];
    foreach ($r as $k => $v) {
        if (in_array($k, $skip, true) || $v === null || $v === '' || $v === '0' && in_array($k, ['hero_id', 'unit_id', 'parent_skill_id'], true)) { continue; }
        if ($k === 'unit_id') { $v = ($unitName[$v] ?? '#' . $v); }
        if ($k === 'hero_id') { $v = ($heroName[$v] ?? '#' . $v); }
        $stats[ucwords(str_replace(['_pct', '_'], ['  %', ' '], $k))] = (string) $v;
    }
    $out = ['name' => $r['name'] ?? '?', 'desc' => $r['description'] ?? '', 'type' => $type, 'stats' => $stats];
    if ($type === 'heroes') {
        $out['abilities'] = array_map(fn($a) => ['name' => $a['name'], 'info' => ($a['ability_type'] ?? '') . ' - ' . ($a['cooldown_sec'] ?? '?') . 's cooldown', 'desc' => $a['description'] ?? ''], $abBy[$r['id']] ?? []);
    }
    return $out;
};
$data = ['units' => [], 'skills' => [], 'heroes' => [], 'items' => []];
foreach ($units as $r) { $d = $pack($r, 'units'); $d['group'] = $r['unit_line'] ?? ($r['type'] ?? 'Units'); $data['units'][] = $d; }
foreach ($skills as $r) { $d = $pack($r, 'skills'); $d['group'] = ucfirst((string) ($r['branch'] ?? 'skills')); $data['skills'][] = $d; }
foreach ($heroes as $r) { $d = $pack($r, 'heroes'); $d['group'] = (string) ($r['role'] ?? 'Heroes'); $data['heroes'][] = $d; }
foreach ($items as $r) { $d = $pack($r, 'items'); $d['group'] = ucfirst($r['rarity']); $d['slot'] = $r['slot']; $d['rarity'] = $r['rarity']; $d['mods'] = Item::statText($r); $data['items'][] = $d; }

$pageTitle = 'Admin Catalog';
require __DIR__ . '/../../includes/header.php';
?>
<style>
    .cat-tabs { display:flex; gap:8px; flex-wrap:wrap; margin:0 0 12px; align-items:center; }
    .cat-tabs button { background:#1c1c32; color:#cfd0ff; border:2px solid #34345a; padding:9px 14px; cursor:pointer; font:.6rem 'Press Start 2P', monospace; }
    .cat-tabs button.on { background:#ffcf5a; color:#1a1424; border-color:#ffcf5a; }
    .cat-tabs input { margin-left:auto; padding:8px 10px; background:#10101f; color:#fff; border:2px solid #34345a; min-width:180px; }
    .cat-group { margin:18px 0 8px; font-size:.75rem; text-transform:uppercase; letter-spacing:.08em; color:#9a9bc8; display:flex; gap:10px; align-items:center; }
    .cat-group::after { content:''; flex:1; height:2px; background:linear-gradient(90deg,#34345a,transparent); }
    .cat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; }
    .cat-tile { background:#14142a; border:2px solid #34345a; padding:8px 10px; cursor:default; font-size:.82rem; color:#e8e8f0; display:flex; gap:8px; align-items:center; min-height:48px; }
    .cat-tile:hover, .cat-tile.hot { border-color:#ffcf5a; background:#1e1e3c; }
    .cat-tile.off { opacity:.45; }
    .cat-tile canvas { flex:none; width:32px; height:32px; image-rendering:pixelated; }
    .cat-tile .chip { flex:none; width:32px; height:32px; display:grid; place-items:center; font:.55rem 'Press Start 2P', monospace; color:#1a1424; background:#8f90e0; }
    #tip { position:fixed; z-index:99; pointer-events:none; display:none; width:290px; background:#0e0e22; border:2px solid #ffcf5a; box-shadow:4px 4px 0 #000; padding:12px; font-size:.8rem; color:#e8e8f0; }
    #tip h4 { margin:0 0 2px; font-size:.95rem; } #tip .sub { color:#9a9bc8; font-size:.72rem; text-transform:uppercase; margin-bottom:6px; }
    #tip .d { font-style:italic; color:#b8b9de; margin:6px 0; }
    #tip .r { display:flex; justify-content:space-between; gap:10px; padding:2px 0; border-bottom:1px solid #20203c; } #tip .r span:first-child { color:#8f90b8; }
    #tip .ab { margin-top:6px; padding-top:6px; border-top:2px solid #34345a; } #tip .ab b { color:#ffcf5a; }
</style>

<h1>Catalog</h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>
<?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>
<p style="opacity:.75">Everything in the game on one page. Hover a tile (or tap it on a phone) to see its stats. Admin only.</p>

<div class="cat-tabs" id="tabs">
    <?php foreach (['units' => 'Units', 'skills' => 'Skills', 'heroes' => 'Heroes', 'items' => 'Items'] as $k => $lab): ?>
        <button type="button" data-t="<?= $k ?>" class="<?= $k === 'units' ? 'on' : '' ?>"><?= $lab ?> (<?= count($data[$k]) ?>)</button>
    <?php endforeach; ?>
    <input id="catq" type="search" placeholder="Search name..." aria-label="Search">
</div>
<div id="catbody"></div>
<div id="tip"></div>

<script type="module">
import { drawItemIcon, RARITY_COLORS } from '<?= BASE_URL ?>/assets/js/game/ItemArt.js';
const DATA = <?= json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
const body = document.getElementById('catbody'), tip = document.getElementById('tip');
let tab = 'units', q = '';
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
const COLORS = { units: '#7fd0ff', skills: '#b070ff', heroes: '#ffcf5a' };

function show(d, x, y) {
    tip.textContent = '';
    tip.appendChild(el('h4', '', d.name));
    tip.appendChild(el('div', 'sub', d.type === 'items' ? d.rarity + ' ' + d.slot : d.group));
    if (d.mods) { const m = el('div', 'r'); m.appendChild(el('span', '', 'Bonus')); m.appendChild(el('span', '', d.mods)); tip.appendChild(m); }
    if (d.desc) tip.appendChild(el('div', 'd', d.desc));
    Object.entries(d.stats).forEach(([k, v]) => { if (d.type === 'items' && /Pct|%/.test(k)) return; const r = el('div', 'r'); r.appendChild(el('span', '', k)); r.appendChild(el('span', '', v)); tip.appendChild(r); });
    (d.abilities || []).forEach((a) => { const b = el('div', 'ab'); const n = el('b', '', a.name); b.appendChild(n); b.appendChild(el('div', 'sub', a.info)); if (a.desc) b.appendChild(el('div', '', a.desc)); tip.appendChild(b); });
    tip.style.display = 'block'; tip.style.borderColor = d.rarity ? RARITY_COLORS[d.rarity] : (COLORS[d.type] || '#ffcf5a');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(innerWidth - w - 8, x + 16) + 'px';
    tip.style.top = Math.max(8, Math.min(innerHeight - h - 8, y + 12)) + 'px';
}
function render() {
    body.textContent = '';
    const list = DATA[tab].filter((d) => d.name.toLowerCase().includes(q));
    const groups = new Map();
    list.forEach((d) => { if (!groups.has(d.group)) groups.set(d.group, []); groups.get(d.group).push(d); });
    if (!list.length) body.appendChild(el('p', '', 'Nothing found.'));
    groups.forEach((arr, g) => {
        body.appendChild(el('div', 'cat-group', g + ' (' + arr.length + ')'));
        const grid = el('div', 'cat-grid');
        arr.forEach((d) => {
            const t = el('div', 'cat-tile' + (d.stats['Is Active'] === '0' ? ' off' : ''));
            if (d.type === 'items') { const c = el('canvas'); c.width = c.height = 32; drawItemIcon(c.getContext('2d'), 0, 0, 32, d.slot, d.rarity, d.name); t.appendChild(c); t.style.borderColor = RARITY_COLORS[d.rarity] + '99'; }
            else { const c = el('div', 'chip', d.name.slice(0, 2).toUpperCase()); c.style.background = COLORS[d.type]; t.appendChild(c); }
            t.appendChild(el('span', '', d.name));
            t.addEventListener('mousemove', (e) => show(d, e.clientX, e.clientY));
            t.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
            t.addEventListener('click', (e) => { document.querySelectorAll('.cat-tile.hot').forEach((x) => x.classList.remove('hot')); t.classList.add('hot'); show(d, e.clientX, e.clientY); });
            grid.appendChild(t);
        });
        body.appendChild(grid);
    });
}
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.t; document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b)); tip.style.display = 'none'; render();
}));
document.getElementById('catq').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); render(); });
render();
</script>
<?php require __DIR__ . '/../../includes/footer.php'; ?>