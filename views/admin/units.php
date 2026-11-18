<?php
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        Csrf::verify($_POST['csrf'] ?? null);
        $id = (int) ($_POST['id'] ?? 0);
        $unit = Unit::find($id);
        if ($unit === null) {
            throw new ValidationException('Unit not found.');
        }
        $db = Database::getInstance();
        if (($_POST['action'] ?? '') === 'toggle') {
            $db->execute('UPDATE units SET is_active = 1 - is_active WHERE id = ?', [$id]);
            adminFlash('ok', $unit->getName() . ' updated.');
        } elseif (($_POST['action'] ?? '') === 'delete') {
            $used = $db->fetchOne('SELECT COUNT(*) AS c FROM skills WHERE unit_id = ?', [$id]);
            if ((int) $used['c'] > 0) {
                throw new ValidationException('Cannot delete ' . $unit->getName() . ': skills still upgrade it. Delete or change those skills first, or just deactivate the unit.');
            }
            $unit->delete();
            adminFlash('ok', $unit->getName() . ' deleted.');
        }
    } catch (ValidationException $e) {
        adminFlash('error', $e->getMessage());
    } catch (DatabaseException $e) {
        adminFlash('error', DEBUG ? $e->getMessage() : 'Something went wrong.');
    }
    adminRedirect('/views/admin/units.php');
}

$q = trim($_GET['q'] ?? '');
$faction = $_GET['faction'] ?? '';
$sort = $_GET['sort'] ?? 'id';
$dir = $_GET['dir'] ?? 'asc';
$params = ['q' => $q, 'faction' => $faction];

$units = [];
$error = '';
try {
    $units = Unit::search($q, $faction, $sort, $dir);
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load units.';
}

$pageTitle = 'Manage Units';
require __DIR__ . '/../../includes/header.php';
?>
<h1>Manage Units</h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>
<?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>

<form class="filters" method="get">
    <input type="text" name="q" placeholder="Search name or type" value="<?= h($q) ?>">
    <select name="faction">
        <option value="">All factions</option>
        <option value="player" <?= $faction === 'player' ? 'selected' : '' ?>>Player</option>
        <option value="mob" <?= $faction === 'mob' ? 'selected' : '' ?>>Mob</option>
    </select>
    <button class="btn small" type="submit">Filter</button>
    <a class="btn small grey" href="units.php">Reset</a>
    <span class="hint">New units need a sprite, so units can only be edited here.</span>
</form>

<div class="panel table-wrap">
<table class="admin-table">
    <tr>
        <th><?= adminSortLink('id', 'ID', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('name', 'Name', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('class_type', 'Type', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('faction', 'Faction', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('cost', 'Cost', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('hp', 'HP', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('damage', 'DMG', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('first_wave', 'Wave', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('is_active', 'Active', $sort, $dir, $params) ?></th>
        <th>Actions</th>
    </tr>
    <?php foreach ($units as $u): ?>
        <tr>
            <td><?= $u->getId() ?></td>
            <td><?= h($u->getName()) ?></td>
            <td><?= h($u->getClassType()) ?></td>
            <td><?= h($u->getFaction()) ?></td>
            <td><?= $u->getCost() ?></td>
            <td><?= $u->getHp() ?></td>
            <td><?= $u->getDamage() ?></td>
            <td><?= $u->getFirstWave() ?></td>
            <td><span class="badge <?= $u->isActive() ? 'on' : '' ?>"><?= $u->isActive() ? 'yes' : 'no' ?></span></td>
            <td>
                <a class="btn small" href="unit_form.php?id=<?= $u->getId() ?>">Edit</a>
                <form method="post">
                    <?= Csrf::field() ?><input type="hidden" name="id" value="<?= $u->getId() ?>">
                    <button class="btn small grey" name="action" value="toggle">Toggle</button>
                </form>
                <form method="post" onsubmit="return confirm('Delete <?= h($u->getName()) ?>?');">
                    <?= Csrf::field() ?><input type="hidden" name="id" value="<?= $u->getId() ?>">
                    <button class="btn small danger" name="action" value="delete">Delete</button>
                </form>
            </td>
        </tr>
    <?php endforeach; ?>
    <?php if (!$units): ?><tr><td colspan="10">No units found.</td></tr><?php endif; ?>
</table>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>