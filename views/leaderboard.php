<?php
require_once __DIR__ . '/../includes/auth_check.php';

$search = trim($_GET['q'] ?? '');
$period = in_array($_GET['period'] ?? '', ['today', 'week'], true) ? $_GET['period'] : 'all';
$sort   = in_array($_GET['sort'] ?? '', ['waves', 'kills'], true) ? $_GET['sort'] : 'score';
$mapId  = (int) ($_GET['map'] ?? 0);
if (!isset(Score::MAPS[$mapId])) {
    $mapId = 0; // 0 = all maps
}

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

// Link for a map tab that keeps the other filters
$tabUrl = function (int $m) use ($search, $period, $sort): string {
    $q = array_filter([
        'q' => $search,
        'period' => $period === 'all' ? '' : $period,
        'sort' => $sort === 'score' ? '' : $sort,
        'map' => $m ?: '',
    ], fn($v) => $v !== '');
    return BASE_URL . '/views/leaderboard.php' . ($q ? '?' . http_build_query($q) : '');
};

$pageTitle = 'Leaderboard';
require __DIR__ . '/../includes/header.php';
?>
<div class="card wide">
    <h1>Leaderboard<?= $mapId ? ' - ' . htmlspecialchars(Score::MAPS[$mapId]) : '' ?></h1>
    <p>Your best: <strong><?= $best['best'] !== null ? (int) $best['best'] : '-' ?></strong> &middot; Runs played: <?= (int) $best['runs'] ?></p>
    <?php if ($error): ?><div class="alert"><?= htmlspecialchars($error) ?></div><?php endif; ?>

    <div class="map-tabs">
        <a class="btn small <?= $mapId === 0 ? '' : 'grey' ?>" href="<?= htmlspecialchars($tabUrl(0)) ?>">All maps</a>
        <?php foreach (Score::MAPS as $id => $name): ?>
            <a class="btn small <?= $mapId === $id ? '' : 'grey' ?>" href="<?= htmlspecialchars($tabUrl($id)) ?>"><?= htmlspecialchars($name) ?></a>
        <?php endforeach; ?>
    </div>

    <form class="filters" method="get">
        <input type="hidden" name="map" value="<?= $mapId ?>">
        <div>
            <label for="q">Player</label>
            <input type="text" id="q" name="q" value="<?= htmlspecialchars($search) ?>" placeholder="Search name">
        </div>
        <div>
            <label for="period">Period</label>
            <select id="period" name="period">
                <option value="all" <?= $period === 'all' ? 'selected' : '' ?>>All time</option>
                <option value="week" <?= $period === 'week' ? 'selected' : '' ?>>Last 7 days</option>
                <option value="today" <?= $period === 'today' ? 'selected' : '' ?>>Today</option>
            </select>
        </div>
        <div>
            <label for="sort">Sort by</label>
            <select id="sort" name="sort">
                <option value="score" <?= $sort === 'score' ? 'selected' : '' ?>>Score</option>
                <option value="waves" <?= $sort === 'waves' ? 'selected' : '' ?>>Waves</option>
                <option value="kills" <?= $sort === 'kills' ? 'selected' : '' ?>>Kills</option>
            </select>
        </div>
        <button class="btn" type="submit">Filter</button>
    </form>

    <div class="table-wrap">
        <table class="board">
            <thead>
                <tr><th>#</th><th>Player</th><th>Map</th><th>Score</th><th>Waves</th><th>Kills</th><th>Souls</th><th>Time</th><th>Date</th></tr>
            </thead>
            <tbody>
            <?php if (!$rows): ?>
                <tr><td colspan="9">No runs found yet.</td></tr>
            <?php endif; ?>
            <?php foreach ($rows as $i => $r): ?>
                <tr class="<?= $r['username'] === $currentUser->getUsername() ? 'me' : '' ?>">
                    <td><?= $i + 1 ?></td>
                    <td><?= htmlspecialchars($r['username']) ?></td>
                    <td><?= htmlspecialchars(Score::MAPS[(int) $r['map_id']] ?? '?') ?></td>
                    <td><?= (int) $r['score'] ?></td>
                    <td><?= (int) $r['waves_reached'] ?></td>
                    <td><?= (int) $r['kills'] ?></td>
                    <td><?= (int) $r['souls_earned'] ?></td>
                    <td><?= fmtTime((int) $r['duration_sec']) ?></td>
                    <td><?= htmlspecialchars(substr($r['played_at'], 0, 10)) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>