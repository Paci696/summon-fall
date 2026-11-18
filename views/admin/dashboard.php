<?php
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

$error = '';
try {
    $t = AdminStats::totals();
    $top = AdminStats::topScores(5);
    $recent = AdminStats::recentRuns(8);
    $days = AdminStats::runsPerDay();
    $hs = Inventory::adminStats();
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load statistics.';
    $t = ['players' => 0, 'admins' => 0, 'runs' => 0, 'units' => 0, 'skills' => 0, 'best' => 0, 'avgWave' => 0, 'kills' => 0, 'souls' => 0];
    $top = $recent = $days = [];
    $hs = ['heroes' => 0, 'items' => 0, 'owned' => 0, 'byRarity' => [], 'heroUse' => []];
}
$maxDay = max(1, $days ? max($days) : 1);

$pageTitle = 'Admin Dashboard';
require __DIR__ . '/../../includes/header.php';
?>
<h1>Admin Dashboard</h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>
<?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>

<div class="tiles">
    <div class="tile"><strong><?= $t['players'] ?></strong><span>Players</span></div>
    <div class="tile"><strong><?= $t['runs'] ?></strong><span>Runs played</span></div>
    <div class="tile"><strong><?= $t['best'] ?></strong><span>Best score</span></div>
    <div class="tile"><strong><?= $t['avgWave'] ?></strong><span>Avg waves</span></div>
    <div class="tile"><strong><?= $t['kills'] ?></strong><span>Total kills</span></div>
    <div class="tile"><strong><?= $t['souls'] ?></strong><span>Souls earned</span></div>
    <div class="tile"><strong><?= $t['units'] ?></strong><span>Units</span></div>
    <div class="tile"><strong><?= $t['skills'] ?></strong><span>Skills</span></div>
    <div class="tile"><strong><?= $hs['heroes'] ?></strong><span>Heroes</span></div>
    <div class="tile"><strong><?= $hs['items'] ?></strong><span>Item types</span></div>
    <div class="tile"><strong><?= $hs['owned'] ?></strong><span>Items found</span></div>
</div>

<div class="panel">
    <h2>Runs per day (last 7 days)</h2>
    <div class="bars">
        <?php foreach ($days as $date => $count): ?>
            <div><?= $count ?><i style="height: <?= round($count / $maxDay * 80) ?>%"></i><?= date('D', strtotime($date)) ?></div>
        <?php endforeach; ?>
    </div>
</div>

<div class="two-col">
    <div class="panel">
        <h2>Items found by rarity</h2>
        <div class="table-wrap"><table class="admin-table">
            <tr><th>Rarity</th><th>Found</th></tr>
            <?php foreach ($hs['byRarity'] as $rarity => $count): ?>
                <tr><td style="color:<?= Item::RARITY_COLORS[$rarity] ?? '#fff' ?>"><?= h(ucfirst($rarity)) ?></td><td><?= $count ?></td></tr>
            <?php endforeach; ?>
            <?php if (!$hs['byRarity']): ?><tr><td colspan="2">No items yet.</td></tr><?php endif; ?>
        </table></div>
    </div>
    <div class="panel">
        <h2>Hero popularity</h2>
        <div class="table-wrap"><table class="admin-table">
            <tr><th>Hero</th><th>Players who chose it</th></tr>
            <?php foreach ($hs['heroUse'] as $r): ?>
                <tr><td><?= h($r['name']) ?></td><td><?= (int) $r['players'] ?></td></tr>
            <?php endforeach; ?>
            <?php if (!$hs['heroUse']): ?><tr><td colspan="2">No heroes yet.</td></tr><?php endif; ?>
        </table></div>
    </div>
</div>

<div class="two-col">
    <div class="panel">
        <h2>Top scores</h2>
        <div class="table-wrap"><table class="admin-table">
            <tr><th>Player</th><th>Score</th><th>Waves</th><th>Kills</th></tr>
            <?php foreach ($top as $r): ?>
                <tr><td><?= h($r['username']) ?></td><td><?= $r['score'] ?></td><td><?= $r['waves_reached'] ?></td><td><?= $r['kills'] ?></td></tr>
            <?php endforeach; ?>
            <?php if (!$top): ?><tr><td colspan="4">No runs yet.</td></tr><?php endif; ?>
        </table></div>
    </div>
    <div class="panel">
        <h2>Recent activity</h2>
        <div class="table-wrap"><table class="admin-table">
            <tr><th>Player</th><th>Score</th><th>Time</th><th>When</th></tr>
            <?php foreach ($recent as $r): ?>
                <tr><td><?= h($r['username']) ?></td><td><?= $r['score'] ?></td><td><?= floor($r['duration_sec'] / 60) ?>m <?= $r['duration_sec'] % 60 ?>s</td><td><?= h($r['played_at']) ?></td></tr>
            <?php endforeach; ?>
            <?php if (!$recent): ?><tr><td colspan="4">No runs yet.</td></tr><?php endif; ?>
        </table></div>
    </div>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>