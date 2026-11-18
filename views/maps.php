<?php
require_once __DIR__ . '/../includes/auth_check.php';

$maps = [
    1 => ['name' => 'Greenfield', 'tag' => 'Balanced',    'desc' => 'Open meadows and a lake in the middle. Your statue is in the bottom-left corner.'],
    2 => ['name' => 'Twin Lakes', 'tag' => 'Chokepoints', 'desc' => 'Start in the top-left. Two lakes force enemies along narrow shores and fords.'],
    3 => ['name' => 'Stonepass',  'tag' => 'Surrounded',  'desc' => 'Rocky ground, with your statue at the bottom-centre. Nests attack from all four corners.'],
];

$pageTitle = 'Choose a Map';
require __DIR__ . '/../includes/header.php';
?>
<section class="hero">
    <h1>Choose a Map</h1>
    <p>Endless mode: survive as many waves as you can.</p>
</section>

<div class="menu-grid">
    <?php foreach ($maps as $id => $m): ?>
        <a class="menu-tile" href="<?= BASE_URL ?>/views/play.php?mode=endless&amp;map=<?= $id ?>">
            <h2><?= htmlspecialchars($m['name']) ?></h2>
            <p><strong><?= htmlspecialchars($m['tag']) ?></strong></p>
            <p><?= htmlspecialchars($m['desc']) ?></p>
        </a>
    <?php endforeach; ?>
</div>
<p style="text-align:center"><a class="btn grey" href="<?= BASE_URL ?>/views/menu.php">Back to menu</a></p> <a class="btn" href="<?= BASE_URL ?>/views/loadout.php">Edit loadout</a>
<?php require __DIR__ . '/../includes/footer.php'; ?>