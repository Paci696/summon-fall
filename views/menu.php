<?php
require_once __DIR__ . '/../includes/auth_check.php';

// [title, description, url, icon]
$items = [
    ['Play Endless', 'Survive wave after wave.',    '/views/maps.php',                '&#9876;'],
    ['Tutorial',     'Learn the basics.',           '/views/play.php?mode=tutorial',  '&#10070;'],
    ['Skill Tree',   'Spend souls on upgrades.',    '/views/skills.php',              '&#10022;'],
    ['Loadout',      'Choose your summon slots.',   '/views/loadout.php',             '&#9733;'],
    ['Heroes',       'Pick a hero and equip loot.', '/views/heroes.php',              '&#9812;'],
    ['Leaderboard',  'See the top survivors.',      '/views/leaderboard.php',         '&#9819;'],
];

$heroKey = 'knight'; $heroName = '';
try {
    $h = Hero::selectedFor($currentUser->getId());
    $heroKey = $h->getSpriteKey();
    $heroName = $h->getName() . ' LV ' . HeroLevel::info($currentUser->getId(), $h->getId())['level'];
} catch (Throwable $e) { /* menu still works without a hero */ }

// highest unlocked version (0 base, 1 elite, 2 godly) of each unit line, for the guards on the title screen
$unitTiers = [];
try {
    foreach (Unit::availableForUser($currentUser->getId()) as $u) {
        $k = $u->getSpriteKey();
        $unitTiers[$k] = max($unitTiers[$k] ?? 0, $u->getTier());
    }
} catch (Throwable $e) { /* menu still works without it */ }

$pageTitle = 'Menu';
require __DIR__ . '/../includes/header.php';
?>
<div class="title-stage">
    <canvas id="title-bg" aria-hidden="true" data-hero="<?= htmlspecialchars($heroKey) ?>" data-hero-name="<?= htmlspecialchars($heroName) ?>" data-units="<?= htmlspecialchars(json_encode((object) $unitTiers)) ?>"></canvas>
    <div class="title-shade"></div>

    <div class="title-player">
        <span class="tp-name"><?= htmlspecialchars($currentUser->getUsername()) ?></span>
        <span class="tp-souls"><i></i><?= (int) $currentUser->getSouls() ?> souls</span>
    </div>

    <div class="title-col">
        <div class="title-logo">
            <small>endless RTS</small>
            <h1><?= htmlspecialchars(APP_NAME) ?></h1>
            <span class="logo-rule"></span>
        </div>

        <nav class="title-menu">
            <?php foreach ($items as $i => $it): ?>
                <a class="tm-btn<?= $i === 0 ? ' primary' : '' ?>" data-key="<?= $i + 1 ?>" href="<?= BASE_URL . $it[2] ?>">
                    <span class="tm-icon"><?= $it[3] ?></span>
                    <span class="tm-text">
                        <b><?= htmlspecialchars($it[0]) ?></b>
                        <em><?= htmlspecialchars($it[1]) ?></em>
                    </span>
                    <span class="tm-key"><?= $i + 1 ?></span>
                </a>
            <?php endforeach; ?>
        </nav>

        <div class="title-sub">
            <?php if ($currentUser->canManageContent()): ?>
                <a data-key="a" href="<?= BASE_URL ?>/views/admin/dashboard.php"><span>A</span> Admin Panel</a>
            <?php endif; ?>
            <a data-key="p" href="<?= BASE_URL ?>/views/profile.php"><span>P</span> Profile</a>
            <a href="<?= BASE_URL ?>/views/auth/logout.php">Logout</a>
        </div>
    </div>

    <div class="title-hint">Press <b>1-<?= count($items) ?></b> to choose</div>
</div>

<script>
document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var el = document.querySelector('[data-key="' + e.key.toLowerCase() + '"]');
    if (el) window.location.href = el.href;
});
</script>
<script type="module" src="<?= BASE_URL ?>/assets/js/game/menu.js?v=<?= @filemtime(BASE_PATH . '/assets/js/game/menu.js') ?: 1 ?>"></script>
<?php require __DIR__ . '/../includes/footer.php'; ?>