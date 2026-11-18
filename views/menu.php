<?php
require_once __DIR__ . '/../includes/auth_check.php';

$items = [
    ['Play Endless', 'Survive wave after wave.', '/views/maps.php'],
    ['Tutorial',     'Learn the basics.',        '/views/play.php?mode=tutorial'],
    ['Skill Tree',   'Spend souls on upgrades.', '/views/skills.php'],
    ['Leaderboard',  'See the top survivors.',   '/views/leaderboard.php'],
    ['Heroes',      'Pick a hero and equip loot.', '/views/heroes.php'],
];

$pageTitle = 'Menu';
require __DIR__ . '/../includes/header.php';
?>
<section class="hero">
    <h1><?= APP_NAME ?></h1>
    <p>Welcome, <?= htmlspecialchars($currentUser->getUsername()) ?> &middot; Souls: <strong><?= (int) $currentUser->getSouls() ?></strong></p>
</section>

<nav class="menu-list">
    <?php foreach ($items as $i => $it): ?>
        <a class="menu-tile menu-item" data-key="<?= $i + 1 ?>" href="<?= BASE_URL . $it[2] ?>">
            <span class="key"><?= $i + 1 ?></span>
            <span>
                <h2><?= htmlspecialchars($it[0]) ?></h2>
                <p><?= htmlspecialchars($it[1]) ?></p>
            </span>
        </a>
    <?php endforeach; ?>
</nav>

<div class="corner-menu">
    <?php if ($currentUser->canManageContent()): ?>
        <a class="menu-tile menu-item" data-key="a" href="<?= BASE_URL ?>/views/admin/dashboard.php">
            <span class="key">A</span><span><h2>Admin Panel</h2></span>
        </a>
    <?php endif; ?>
    <a class="menu-tile menu-item" data-key="p" href="<?= BASE_URL ?>/views/profile.php">
        <span class="key">P</span><span><h2>Profile</h2></span>
    </a>
</div>

<script>
document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var el = document.querySelector('[data-key="' + e.key.toLowerCase() + '"]');
    if (el) window.location.href = el.href;
});
</script>
<?php require __DIR__ . '/../includes/footer.php'; ?>