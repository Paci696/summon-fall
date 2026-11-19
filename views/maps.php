<?php
require_once __DIR__ . '/../includes/auth_check.php';

// id => [name, tag, description, danger (1-3), start corner]
$maps = [
    1 => ['Greenfield', 'Balanced',     'Open meadows and a lake in the middle. Your statue is in the bottom-left corner.', 1, 'Bottom-left'],
    2 => ['Twin Lakes', 'Chokepoints',  'Start in the top-left. Two lakes force enemies along narrow shores and fords.',      2, 'Top-left'],
    3 => ['Stonepass',  'Surrounded',   'Rocky ground, with your statue at the bottom-centre. Nests attack from all four corners.', 3, 'Bottom-centre'],
];

$pageTitle = 'Choose a Map';
require __DIR__ . '/../includes/header.php';
?>
<style>
.mp { max-width: 1100px; margin: 0 auto; }
.mp h1 { text-align: center; text-transform: uppercase; font-size: clamp(1.3rem, 3.4vw, 2rem); margin: 6px 0 4px; text-shadow: 0 3px 0 #b05a12, 0 0 24px rgba(255,170,60,.35); }
.mp .sub { text-align: center; color: #9a9bc8; margin: 0 0 26px; }
.mp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 20px; }
.mp-card { position: relative; display: flex; flex-direction: column; text-decoration: none; color: inherit; overflow: hidden;
    background: linear-gradient(180deg, #25254a, #14142a); border: 2px solid #34345a; box-shadow: 4px 4px 0 #05040f; transition: transform .14s, border-color .14s, box-shadow .14s; }
.mp-card:hover, .mp-card:focus-visible { transform: translateY(-6px); border-color: #ffcf5a; box-shadow: 4px 4px 0 #05040f, 0 0 28px rgba(255,207,90,.25); outline: none; }
.mp-prev { position: relative; background: #07050f; border-bottom: 2px solid #34345a; }
.mp-prev canvas { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; image-rendering: pixelated; transition: filter .2s; filter: brightness(.85) saturate(.9); }
.mp-card:hover .mp-prev canvas { filter: none; }
.mp-key { position: absolute; top: 8px; left: 8px; min-width: 26px; height: 26px; display: grid; place-items: center; font: .6rem 'Press Start 2P', monospace; color: #1a1424; background: #ffcf5a; box-shadow: 0 3px 0 #b88a22; }
.mp-tag { position: absolute; top: 8px; right: 8px; padding: 6px 8px; font: .5rem 'Press Start 2P', monospace; text-transform: uppercase; color: #c9c4ff; background: rgba(20,18,50,.85); border: 2px solid #3a3a7a; }
.mp-body { padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.mp-body h2 { margin: 0; font-size: .95rem; text-transform: uppercase; color: #fff; }
.mp-body p { margin: 0; color: #a8a9d0; font-size: .88rem; line-height: 1.45; flex: 1; }
.mp-meta { display: flex; justify-content: space-between; align-items: center; font-size: .78rem; color: #8f90b8; }
.mp-danger { display: inline-flex; gap: 3px; vertical-align: middle; margin-left: 6px; }
.mp-danger i { width: 10px; height: 12px; background: #2c2c52; clip-path: polygon(50% 0, 100% 40%, 80% 100%, 20% 100%, 0 40%); }
.mp-danger i.on { background: #ff6a4a; box-shadow: 0 0 6px #ff6a4a; }
.mp-play { display: block; text-align: center; margin-top: 4px; padding: 12px; background: #2a2a58; color: #cfd0ff; font: .6rem 'Press Start 2P', monospace; text-transform: uppercase; transition: background .12s, color .12s; }
.mp-card:hover .mp-play { background: #ffcf5a; color: #1a1424; box-shadow: 0 4px 0 #b88a22; }
.mp-legend { display: flex; flex-wrap: wrap; gap: 18px; justify-content: center; margin: 22px 0 6px; font-size: .8rem; color: #8f90b8; }
.mp-legend span::before { content: ''; display: inline-block; width: 10px; height: 10px; margin-right: 7px; background: var(--c); vertical-align: -1px; }
.mp-actions { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; margin: 22px 0; }
.mp-actions .btn { margin: 0; }
</style>

<div class="mp">
    <h1>Choose a Map</h1>
    <p class="sub">Endless mode: survive as many waves as you can.</p>

    <div class="mp-grid">
        <?php foreach ($maps as $id => $m): ?>
            <a class="mp-card" data-key="<?= $id ?>" href="<?= BASE_URL ?>/views/play.php?map=<?= $id ?>">
                <div class="mp-prev">
                    <canvas width="96" height="54" data-map="<?= $id ?>"></canvas>
                    <span class="mp-key"><?= $id ?></span>
                    <span class="mp-tag"><?= htmlspecialchars($m[1]) ?></span>
                </div>
                <div class="mp-body">
                    <h2><?= htmlspecialchars($m[0]) ?></h2>
                    <p><?= htmlspecialchars($m[2]) ?></p>
                    <div class="mp-meta">
                        <span>Start: <?= htmlspecialchars($m[4]) ?></span>
                        <span>Danger<span class="mp-danger"><?php for ($i = 1; $i <= 3; $i++): ?><i class="<?= $i <= $m[3] ? 'on' : '' ?>"></i><?php endfor; ?></span></span>
                    </div>
                    <span class="mp-play">Play</span>
                </div>
            </a>
        <?php endforeach; ?>
    </div>

    <div class="mp-legend">
        <span style="--c:#4fa8ff">Your statue</span>
        <span style="--c:#ffcf5a">Gold mine</span>
        <span style="--c:#ff5a3a">Enemy nest</span>
    </div>

    <div class="mp-actions">
        <a class="btn grey" data-key="b" href="<?= BASE_URL ?>/views/menu.php">Back to menu</a>
        <a class="btn" data-key="l" href="<?= BASE_URL ?>/views/loadout.php">Edit loadout</a>
    </div>
</div>

<script type="module">
import { GameMap, MINI_COLORS } from '<?= BASE_URL ?>/assets/js/game/GameMap.js';

document.querySelectorAll('canvas[data-map]').forEach((cv) => {
    const map = new GameMap(parseInt(cv.dataset.map, 10));
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let y = 0; y < map.rows; y++) {
        for (let x = 0; x < map.cols; x++) {
            g.fillStyle = MINI_COLORS[map.tiles[y][x]] || '#3f7d3a';
            g.fillRect(x, y, 1, 1);
        }
    }
    const mark = (p, color, r) => {
        g.fillStyle = '#000'; g.fillRect(p.tx - r - 1, p.ty - r - 1, r * 2 + 2, r * 2 + 2);
        g.fillStyle = color;  g.fillRect(p.tx - r, p.ty - r, r * 2, r * 2);
    };
    map.nests.forEach((n) => mark(n, '#ff5a3a', 2));
    map.mines.forEach((m) => mark(m, '#ffcf5a', 1));
    mark(map.playerBase, '#4fa8ff', 3);
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const el = document.querySelector('[data-key="' + e.key.toLowerCase() + '"]');
    if (el) window.location.href = el.href;
    if (e.key === 'Escape') window.location.href = '<?= BASE_URL ?>/views/menu.php';
});
</script>
<?php require __DIR__ . '/../includes/footer.php'; ?>