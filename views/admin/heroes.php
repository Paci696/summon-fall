<?php
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        Csrf::verify($_POST['csrf'] ?? null);
        $hero = Hero::find((int) ($_POST['id'] ?? 0));
        if ($hero === null) {
            throw new ValidationException('Hero not found.');
        }
        if (($_POST['action'] ?? '') === 'toggle') {
            $active = Database::getInstance()->fetchOne('SELECT COUNT(*) AS c FROM heroes WHERE is_active = 1 AND id <> ?', [$hero->getId()]);
            if ($hero->isActive() && (int) $active['c'] === 0) {
                throw new ValidationException('At least one hero must stay active.');
            }
            Database::getInstance()->execute('UPDATE heroes SET is_active = 1 - is_active WHERE id = ?', [$hero->getId()]);
            adminFlash('ok', $hero->getName() . ' updated.');
        }
    } catch (ValidationException $e) {
        adminFlash('error', $e->getMessage());
    } catch (DatabaseException $e) {
        adminFlash('error', DEBUG ? $e->getMessage() : 'Something went wrong.');
    }
    adminRedirect('/views/admin/heroes.php');
}

$q = trim($_GET['q'] ?? '');
$sort = $_GET['sort'] ?? 'id';
$dir = $_GET['dir'] ?? 'asc';
$params = ['q' => $q];

$heroes = [];
$error = '';
try {
    $heroes = Hero::search($q, $sort, $dir);
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load heroes.';
}

$pageTitle = 'Manage Heroes';
require __DIR__ . '/../../includes/header.php';
?>
<h1>Manage Heroes</h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>
<?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>

<form class="filters" method="get">
    <input type="text" name="q" placeholder="Search name or description" value="<?= h($q) ?>">
    <button class="btn small" type="submit">Filter</button>
    <a class="btn small grey" href="heroes.php">Reset</a>
    <span class="hint">Heroes have coded sprites, so you can edit them but not add new ones.</span>
</form>

<div class="panel table-wrap">
<table class="admin-table">
    <tr>
        <th><?= adminSortLink('id', 'ID', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('name', 'Name', $sort, $dir, $params) ?></th>
        <th>Role</th>
        <th><?= adminSortLink('hp', 'HP', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('damage', 'DMG', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('speed', 'Speed', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('attack_range', 'Range', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('revive_sec', 'Revive', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('is_active', 'Active', $sort, $dir, $params) ?></th>
        <th>Actions</th>
    </tr>
    <?php foreach ($heroes as $hero): ?>
        <tr>
            <td><?= $hero->getId() ?></td>
            <td><?= h($hero->getName()) ?></td>
            <td><?= h($hero->getRole()) ?> (<?= h($hero->getAttackType()) ?>)</td>
            <td><?= $hero->getHp() ?></td>
            <td><?= $hero->getDamage() ?></td>
            <td><?= $hero->getSpeed() ?></td>
            <td><?= $hero->getAttackRange() ?></td>
            <td><?= $hero->getReviveSec() ?>s</td>
            <td><span class="badge <?= $hero->isActive() ? 'on' : '' ?>"><?= $hero->isActive() ? 'yes' : 'no' ?></span></td>
            <td>
                <a class="btn small" href="hero_form.php?id=<?= $hero->getId() ?>">Edit</a>
                <form method="post">
                    <?= Csrf::field() ?><input type="hidden" name="id" value="<?= $hero->getId() ?>">
                    <button class="btn small grey" name="action" value="toggle">Toggle</button>
                </form>
            </td>
        </tr>
    <?php endforeach; ?>
    <?php if (!$heroes): ?><tr><td colspan="10">No heroes found.</td></tr><?php endif; ?>
</table>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>