<?php
$adminFlash = adminTakeFlash();
$adminPage = basename($_SERVER['SCRIPT_NAME']);
$adminPage = ['hero_form.php' => 'heroes.php', 'item_form.php' => 'items.php', 'unit_form.php' => 'units.php', 'skill_form.php' => 'skills.php'][$adminPage] ?? $adminPage;
$adminLinks = [
    'dashboard.php' => 'Dashboard',
    'units.php'     => 'Units',
    'skills.php'    => 'Skills',
    'heroes.php'    => 'Heroes',
    'items.php'     => 'Items',
    'users.php'     => 'Users',
];
?>
<nav class="admin-nav">
    <?php foreach ($adminLinks as $file => $label): ?>
        <a class="<?= $adminPage === $file ? 'on' : '' ?>" href="<?= BASE_URL ?>/views/admin/<?= $file ?>"><?= $label ?></a>
    <?php endforeach; ?>
</nav>
<?php if ($adminFlash): ?>
    <div class="alert <?= $adminFlash[0] === 'ok' ? 'ok' : '' ?>"><?= h($adminFlash[1]) ?></div>
<?php endif; ?>