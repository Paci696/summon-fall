<?php
require_once __DIR__ . '/../includes/auth_check.php';

// id => [name, tag, description, danger (1-3), start corner, accent colour]
$maps = [
    1 => ['Greenfield', 'Balanced',    'Open green meadows with a lake in the middle. Your statue is in the bottom-left corner.', 1, 'Bottom-left', '#6fdc5a'],
    2 => ['Twin Lakes', 'Chokepoints', 'Start in the top-left. Two lakes and reedy shores force enemies along narrow fords.',   2, 'Top-left', '#4fc8ea'],
    3 => ['Stonepass',  'Surrounded',  'Rocky highland with stone ridges and autumn woods. Your statue is at the bottom-centre and nests attack from all four corners.', 3, 'Bottom-centre', '#f0902a'],
    4 => ['Frostveil',  'Frozen',      'Snowbound pines and frozen ponds under a steady snowfall. Your statue is in the top-right and enemies march in from the west and south.', 2, 'Top-right', '#a8e4ff'],
];
$data = [];
foreach ($maps as $id => $m) {
    $data[] = ['id' => $id, 'name' => $m[0], 'tag' => $m[1], 'desc' => $m[2], 'danger' => $m[3], 'start' => $m[4], 'accent' => $m[5]];
}

$pageTitle = 'Choose a Map';
require __DIR__ . '/../includes/header.php';
?>
<style>
.ms { --ac: #ffcf5a; width: min(1240px, calc(100vw - 32px)); margin: 0 auto; position: relative; left: 50%; transform: translateX(-50%); }
.ms h1 { text-align: center; text-transform: uppercase; font-size: clamp(1.3rem, 3.4vw, 2rem); margin: 6px 0 4px; text-shadow: 0 3px 0 #b05a12, 0 0 24px rgba(255,170,60,.35); }
.ms .sub { text-align: center; color: #9a9bc8; margin: 0 0 22px; }
.ms-grid { display: grid; grid-template-columns: 300px 1fr; gap: 22px; align-items: start; }
@media (max-width: 900px) { .ms-grid { grid-template-columns: 1fr; } }

/* map list */
.ms-list { display: flex; flex-direction: column; gap: 10px; }
.ms-item { position: relative; display: flex; align-items: center; gap: 12px; width: 100%; margin: 0; padding: 12px 14px; text-align: left; cursor: pointer; color: #dcdcf5;
    background: linear-gradient(90deg, rgba(38,38,70,.9), rgba(20,18,40,.65)); border: 2px solid #34345a; border-left: 5px solid var(--c); box-shadow: 3px 3px 0 #05040f; font-family: inherit; transition: transform .12s, border-color .12s, background .12s; }
.ms-item:hover { transform: translateX(6px); border-color: var(--c); }
.ms-item.on { transform: translateX(10px); border-color: var(--c); background: linear-gradient(90deg, color-mix(in srgb, var(--c) 28%, #1a1a30), rgba(20,18,40,.7)); box-shadow: 3px 3px 0 #05040f, 0 0 22px color-mix(in srgb, var(--c) 35%, transparent); }
.ms-num { flex: 0 0 28px; height: 28px; display: grid; place-items: center; font: .6rem 'Press Start 2P', monospace; color: #1a1424; background: var(--c); box-shadow: 0 3px 0 rgba(0,0,0,.35); }
.ms-txt { flex: 1; min-width: 0; }
.ms-txt b { display: block; font: normal .72rem 'Press Start 2P', monospace; text-transform: uppercase; color: #fff; }
.ms-txt em { display: block; margin-top: 7px; font-style: normal; font-size: .78rem; color: #9a9bc8; }
.pips { display: inline-flex; gap: 3px; }
.pips i { width: 9px; height: 11px; background: #2c2c52; clip-path: polygon(50% 0, 100% 40%, 80% 100%, 20% 100%, 0 40%); }
.pips i.on { background: #ff6a4a; box-shadow: 0 0 6px #ff6a4a; }
.ms-side { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
.ms-side .btn { margin: 0; flex: 1; text-align: center; }

/* showcase */
.ms-show { position: relative; background: linear-gradient(180deg, #232344, #14142a); border: 2px solid #34345a; border-top: 4px solid var(--ac); box-shadow: 5px 5px 0 #05040f, 0 0 40px color-mix(in srgb, var(--ac) 22%, transparent); transition: border-color .3s, box-shadow .3s; }
.ms-view { position: relative; background: #07050f; border-bottom: 2px solid #34345a; overflow: hidden; }
.ms-view canvas { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; }
.ms-view canvas.in { animation: msIn .35s ease-out; }
@keyframes msIn { from { opacity: 0; transform: scale(1.04); } }
.ms-view::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.45) 100%); }
.ms-pill { position: absolute; z-index: 2; top: 12px; left: 12px; padding: 7px 10px; font: .5rem 'Press Start 2P', monospace; text-transform: uppercase; color: #1a1424; background: var(--ac); box-shadow: 0 3px 0 rgba(0,0,0,.4); }
.ms-leg { position: absolute; z-index: 2; right: 12px; bottom: 10px; display: flex; gap: 14px; padding: 6px 10px; background: rgba(8,6,20,.75); font-size: .72rem; color: #b8b9de; }
.ms-leg span::before { content: ''; display: inline-block; width: 9px; height: 9px; margin-right: 6px; background: var(--c); }
.ms-info { display: grid; grid-template-columns: 1fr auto; gap: 18px 24px; padding: 18px 20px 20px; align-items: center; }
@media (max-width: 700px) { .ms-info { grid-template-columns: 1fr; } }
.ms-info h2 { margin: 0 0 8px; font-size: 1.1rem; text-transform: uppercase; color: #fff; text-shadow: 0 0 18px color-mix(in srgb, var(--ac) 60%, transparent); }
.ms-info p { margin: 0 0 12px; color: #b8b9de; font-size: .92rem; line-height: 1.5; max-width: 62ch; }
.ms-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 5px 9px; background: #1c1c38; border: 2px solid #34345a; font-size: .78rem; color: #cfd0ff; display: inline-flex; align-items: center; gap: 8px; }
.chip small { color: #8f90b8; font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; }
.ms-go { display: block; padding: 18px 34px; text-align: center; text-decoration: none; background: var(--ac); color: #14101e; font: .8rem 'Press Start 2P', monospace; text-transform: uppercase; box-shadow: 0 6px 0 rgba(0,0,0,.45); transition: transform .08s, filter .12s; }
.ms-go:hover { filter: brightness(1.12); }
.ms-go:active { transform: translateY(5px); box-shadow: 0 1px 0 rgba(0,0,0,.45); }
.ms-go small { display: block; margin-top: 9px; font-size: .45rem; opacity: .7; }
</style>

<div class="ms">
    <h1>Choose a Map</h1>
    <p class="sub">Endless mode: survive as many waves as you can.</p>

    <div class="ms-grid">
        <div>
            <div class="ms-list" role="listbox" aria-label="Maps">
                <?php foreach ($maps as $id => $m): ?>
                    <button type="button" class="ms-item" data-id="<?= $id ?>" style="--c:<?= $m[5] ?>">
                        <span class="ms-num"><?= $id ?></span>
                        <span class="ms-txt"><b><?= htmlspecialchars($m[0]) ?></b><em><?= htmlspecialchars($m[1]) ?></em></span>
                        <span class="pips"><?php for ($i = 1; $i <= 3; $i++): ?><i class="<?= $i <= $m[3] ? 'on' : '' ?>"></i><?php endfor; ?></span>
                    </button>
                <?php endforeach; ?>
            </div>
            <div class="ms-side">
                <a class="btn grey" data-key="b" href="<?= BASE_URL ?>/views/menu.php">Back</a>
                <a class="btn" data-key="l" href="<?= BASE_URL ?>/views/loadout.php">Loadout</a>
            </div>
        </div>

        <div class="ms-show" id="show">
            <div class="ms-view">
                <canvas id="view" width="960" height="540"></canvas>
                <span class="ms-pill" id="pill"></span>
                <div class="ms-leg"><span style="--c:#4fa8ff">Statue</span><span style="--c:#ffcf5a">Gold mine</span><span style="--c:#ff5a3a">Nests</span></div>
            </div>
            <div class="ms-info">
                <div>
                    <h2 id="name"></h2>
                    <p id="desc"></p>
                    <div class="ms-chips" id="chips"></div>
                </div>
                <a class="ms-go" id="go" href="#">Deploy<small>Enter</small></a>
            </div>
        </div>
    </div>
</div>

<script type="module">
import { GameMap, TILE } from '<?= BASE_URL ?>/assets/js/game/GameMap.js?v=<?= @filemtime(BASE_PATH . '/assets/js/game/GameMap.js') ?: 1 ?>';

const MAPS = <?= json_encode($data) ?>;
const PLAY = '<?= BASE_URL ?>/views/play.php?map=';
const view = document.getElementById('view'), vg = view.getContext('2d');
const cache = {};
let current = 0;

// Paint the whole map with the game's own tiles, then shrink it to fit the preview.
function overview(id) {
    if (cache[id]) return cache[id];
    const map = new GameMap(id), art = map.art;
    const big = document.createElement('canvas');
    big.width = map.widthPx; big.height = map.heightPx;
    const g = big.getContext('2d'); g.imageSmoothingEnabled = false;
    map.draw(g, { x: 0, y: 0, viewW: big.width, viewH: big.height });
    const at = (t) => [t.tx * TILE + TILE / 2, t.ty * TILE + TILE / 2];
    map.mines.forEach((m) => { const [x, y] = at(m); g.drawImage(art.mine[0], x - 24, y - 30); });
    { const [x, y] = at(map.playerBase); g.drawImage(art.statue, x - 32, y - 100); }

    const out = document.createElement('canvas');
    out.width = 960; out.height = 540;
    const o = out.getContext('2d');
    o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
    o.drawImage(big, 0, 0, 960, 540);
    const k = 960 / map.widthPx;
    const ring = (t, col, r) => {
        const [x, y] = at(t);
        o.lineWidth = 3; o.strokeStyle = '#000'; o.beginPath(); o.arc(x * k, y * k, r + 1.5, 0, 6.3); o.stroke();
        o.lineWidth = 2; o.strokeStyle = col; o.beginPath(); o.arc(x * k, y * k, r, 0, 6.3); o.stroke();
    };
    map.nests.forEach((n) => ring(n, '#ff5a3a', 15));
    map.mines.forEach((m) => ring(m, '#ffcf5a', 11));
    ring(map.playerBase, '#4fa8ff', 19);
    cache[id] = { canvas: out, nests: map.nests.length };
    return cache[id];
}

function show(i) {
    current = i;
    const m = MAPS[i];
    const ov = overview(m.id);
    vg.drawImage(ov.canvas, 0, 0);
    view.classList.remove('in'); void view.offsetWidth; view.classList.add('in');
    document.querySelector('.ms').style.setProperty('--ac', m.accent);
    document.getElementById('pill').textContent = m.tag;
    document.getElementById('name').textContent = m.name;
    document.getElementById('desc').textContent = m.desc;
    document.getElementById('go').href = PLAY + m.id;
    const pips = [1, 2, 3].map((n) => '<span class="pips"><i class="' + (n <= m.danger ? 'on' : '') + '"></i></span>').join('');
    document.getElementById('chips').innerHTML =
        '<span class="chip"><small>Start</small>' + m.start + '</span>' +
        '<span class="chip"><small>Nests</small>' + ov.nests + '</span>' +
        '<span class="chip"><small>Danger</small><span class="pips">' + [1, 2, 3].map((n) => '<i class="' + (n <= m.danger ? 'on' : '') + '"></i>').join('') + '</span></span>';
    document.querySelectorAll('.ms-item').forEach((b, k) => b.classList.toggle('on', k === i));
}

document.querySelectorAll('.ms-item').forEach((b, i) => {
    b.addEventListener('click', () => (current === i ? (location.href = PLAY + MAPS[i].id) : show(i)));
    b.addEventListener('mouseenter', () => { if (current !== i) show(i); });
    b.addEventListener('dblclick', () => { location.href = PLAY + MAPS[i].id; });
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    const n = parseInt(k, 10);
    if (n >= 1 && n <= MAPS.length) show(n - 1);
    else if (k === 'arrowdown' || k === 's') show((current + 1) % MAPS.length);
    else if (k === 'arrowup' || k === 'w') show((current + MAPS.length - 1) % MAPS.length);
    else if (k === 'enter' || k === ' ') { e.preventDefault(); location.href = PLAY + MAPS[current].id; }
    else if (k === 'escape') location.href = '<?= BASE_URL ?>/views/menu.php';
    else { const el = document.querySelector('a[data-key="' + k + '"]'); if (el) location.href = el.href; }
});

show(0);
</script>
<?php require __DIR__ . '/../includes/footer.php'; ?>