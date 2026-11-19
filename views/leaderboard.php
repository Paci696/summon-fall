<?php
require_once __DIR__ . '/../includes/auth_check.php';

$search = trim($_GET['q'] ?? '');
$period = in_array($_GET['period'] ?? '', ['today', 'week'], true) ? $_GET['period'] : 'all';
$sort   = in_array($_GET['sort'] ?? '', ['waves', 'kills'], true) ? $_GET['sort'] : 'score';
$mapId  = (int) ($_GET['map'] ?? $_GET['map_id'] ?? 0);
if (!isset(Score::MAPS[$mapId])) { $mapId = 0; }

$rows = [];
$best = ['best' => null, 'runs' => 0];
$error = '';
try {
    $rows = Score::leaderboard($search, $period, $sort, 50, $mapId);
    $best = Score::bestFor($currentUser->getId());
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load the leaderboard.';
}

function fmtTime(int $s): string { return sprintf('%d:%02d', intdiv($s, 60), $s % 60); }
function lbUrl(array $over): string {
    $q = array_merge($_GET, $over);
    foreach ($q as $k => $v) { if ($v === '' || $v === 0 || $v === '0' || $v === 'all' && $k === 'period' || $v === 'score' && $k === 'sort') unset($q[$k]); }
    return '?' . http_build_query($q);
}

$podium = array_slice($rows, 0, 3);
$rest = array_slice($rows, 3, null, true);
$me = $currentUser->getUsername();
$pageTitle = 'Leaderboard';
require __DIR__ . '/../includes/header.php';
?>
<style>
.lb { --gold:#ffcf5a; --line:#34345a; max-width: 980px; margin: 0 auto; }
.lb h1 { text-align:center; font-size: clamp(1.4rem, 3.4vw, 2.1rem); text-transform: uppercase; margin: 6px 0 4px;
    text-shadow: 0 3px 0 #b05a12, 0 0 24px rgba(255,170,60,.35); }
.lb .sub { text-align:center; color:#9a9bc8; margin:0 0 22px; }
.lb .sub b { color: var(--gold); }

.lb-tabs { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-bottom:14px; }
.lb-tabs a { padding:9px 14px; font:.6rem 'Press Start 2P', monospace; color:#cfd0ff; text-decoration:none; background:#1c1c32; border:2px solid var(--line); box-shadow:3px 3px 0 #05040f; }
.lb-tabs a:hover { border-color:#6d6d92; }
.lb-tabs a.on { background: var(--gold); color:#1a1424; border-color: var(--gold); }

.lb-filter { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; align-items:center; margin-bottom:26px; padding:10px;
    background: rgba(12,10,28,.6); border:2px solid var(--line); }
.lb-filter input, .lb-filter select { margin:0; width:auto; min-width:140px; padding:8px 10px; background:#0d0d18; color:#fff; border:2px solid var(--line); border-radius:0; font-size:.85rem; }
.lb-filter .btn { margin:0; padding:9px 16px; }
.lb-filter .reset { color:#8f90b8; font-size:.8rem; text-decoration:none; }

/* podium */
.podium { display:grid; grid-template-columns: 1fr 1.15fr 1fr; gap:14px; align-items:end; margin-bottom:26px; }
.pod { position:relative; text-align:center; padding:18px 10px 14px; background:linear-gradient(180deg,#26264a,#14142a); border:2px solid var(--line); box-shadow:4px 4px 0 #05040f; }
.pod.p1 { padding-top:30px; padding-bottom:22px; border-color:#ffcf5a; background:linear-gradient(180deg,#4a3a12,#17142a 70%); box-shadow:4px 4px 0 #05040f, 0 0 26px rgba(255,207,90,.25); }
.pod.p2 { border-color:#c4c9e0; } .pod.p3 { border-color:#c8803a; }
.pod .medal { position:absolute; top:-16px; left:50%; transform:translateX(-50%); width:34px; height:34px; display:grid; place-items:center;
    font:.8rem 'Press Start 2P', monospace; color:#1a1424; background:#c4c9e0; box-shadow:0 3px 0 #05040f; }
.pod.p1 .medal { background:#ffcf5a; width:40px; height:40px; top:-20px; } .pod.p3 .medal { background:#c8803a; }
.pod .nm { font:.7rem 'Press Start 2P', monospace; color:#fff; margin:10px 0 8px; word-break:break-word; }
.pod .sc { font:1.15rem 'Press Start 2P', monospace; color:var(--gold); }
.pod.p1 .sc { font-size:1.5rem; }
.pod .meta { margin-top:8px; font-size:.78rem; color:#9a9bc8; }
.pod.you .nm::after { content:' (you)'; color:#6fff9a; }

/* rows */
.lb-rows { display:flex; flex-direction:column; gap:6px; }
.lb-head, .lb-row { display:grid; grid-template-columns: 44px minmax(110px,1.6fr) 1fr 1fr .7fr .7fr .8fr .9fr; gap:8px; align-items:center; padding:10px 14px; }
.lb-head { font:.52rem 'Press Start 2P', monospace; color:#8f90b8; text-transform:uppercase; }
.lb-row { background:linear-gradient(90deg, rgba(38,38,70,.75), rgba(20,18,40,.6)); border:2px solid #2a2a4a; border-left:4px solid #4a4a80; }
.lb-row:hover { border-color:#6d6d92; }
.lb-row.me { border-color:#6fff9a; border-left-color:#6fff9a; background:linear-gradient(90deg, rgba(30,80,50,.55), rgba(20,18,40,.6)); }
.lb-row .rk { font:.65rem 'Press Start 2P', monospace; color:#8f90b8; }
.lb-row .who { color:#fff; font-weight:bold; }
.lb-row .score { color:var(--gold); font-weight:bold; }
.lb-row .dim { color:#9a9bc8; font-size:.85rem; }
.lb-empty { text-align:center; padding:30px; border:2px dashed var(--line); color:#9a9bc8; }
@media (max-width: 760px) {
    .podium { grid-template-columns: 1fr; } .pod.p1 { order:-1; }
    .lb-head { display:none; }
    .lb-row { grid-template-columns: 36px 1fr auto; }
    .lb-row .hide-s { display:none; }
}
</style>

<div class="lb">
    <h1>Leaderboard</h1>
    <p class="sub">Your best: <b><?= $best['best'] !== null ? (int) $best['best'] : '-' ?></b> &middot; Runs played: <b><?= (int) $best['runs'] ?></b></p>
    <?php if ($error): ?><div class="alert"><?= htmlspecialchars($error) ?></div><?php endif; ?>

    <div class="lb-tabs">
        <a class="<?= $mapId === 0 ? 'on' : '' ?>" href="<?= lbUrl(['map' => 0]) ?>">All maps</a>
        <?php foreach (Score::MAPS as $id => $name): ?>
            <a class="<?= $mapId === $id ? 'on' : '' ?>" href="<?= lbUrl(['map' => $id]) ?>"><?= htmlspecialchars($name) ?></a>
        <?php endforeach; ?>
    </div>

    <form class="lb-filter" method="get">
        <?php if ($mapId): ?><input type="hidden" name="map" value="<?= $mapId ?>"><?php endif; ?>
        <input type="text" name="q" value="<?= htmlspecialchars($search) ?>" placeholder="Search player" aria-label="Player">
        <select name="period" aria-label="Period">
            <option value="all" <?= $period === 'all' ? 'selected' : '' ?>>All time</option>
            <option value="week" <?= $period === 'week' ? 'selected' : '' ?>>Last 7 days</option>
            <option value="today" <?= $period === 'today' ? 'selected' : '' ?>>Today</option>
        </select>
        <select name="sort" aria-label="Sort by">
            <option value="score" <?= $sort === 'score' ? 'selected' : '' ?>>Sort: Score</option>
            <option value="waves" <?= $sort === 'waves' ? 'selected' : '' ?>>Sort: Waves</option>
            <option value="kills" <?= $sort === 'kills' ? 'selected' : '' ?>>Sort: Kills</option>
        </select>
        <button class="btn" type="submit">Filter</button>
        <a class="reset" href="?">Reset</a>
    </form>

    <?php if (!$rows): ?>
        <div class="lb-empty">No runs found yet. Go survive some waves!</div>
    <?php else: ?>
        <?php if (count($podium) >= 1): ?>
        <div class="podium">
            <?php
            // visual order: 2nd, 1st, 3rd
            foreach ([1, 0, 2] as $idx):
                if (!isset($podium[$idx])) { echo '<div></div>'; continue; }
                $r = $podium[$idx];
                $val = $sort === 'waves' ? (int) $r['waves_reached'] : ($sort === 'kills' ? (int) $r['kills'] : (int) $r['score']);
            ?>
                <div class="pod p<?= $idx + 1 ?> <?= $r['username'] === $me ? 'you' : '' ?>">
                    <span class="medal"><?= $idx + 1 ?></span>
                    <div class="nm"><?= htmlspecialchars($r['username']) ?></div>
                    <div class="sc"><?= $val ?></div>
                    <div class="meta"><?= htmlspecialchars(Score::MAPS[(int) $r['map_id']] ?? '') ?> &middot; wave <?= (int) $r['waves_reached'] ?> &middot; <?= (int) $r['kills'] ?> kills</div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <div class="lb-rows">
            <div class="lb-head"><span>#</span><span>Player</span><span>Map</span><span>Score</span><span>Waves</span><span>Kills</span><span>Souls</span><span>Time</span></div>
            <?php foreach ($rows as $i => $r): ?>
                <div class="lb-row <?= $r['username'] === $me ? 'me' : '' ?>">
                    <span class="rk"><?= $i + 1 ?></span>
                    <span class="who"><?= htmlspecialchars($r['username']) ?></span>
                    <span class="dim hide-s"><?= htmlspecialchars(Score::MAPS[(int) $r['map_id']] ?? '-') ?></span>
                    <span class="score"><?= (int) $r['score'] ?></span>
                    <span class="hide-s"><?= (int) $r['waves_reached'] ?></span>
                    <span class="hide-s"><?= (int) $r['kills'] ?></span>
                    <span class="hide-s dim"><?= (int) $r['souls_earned'] ?></span>
                    <span class="dim"><?= fmtTime((int) $r['duration_sec']) ?></span>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>