<?php
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        Csrf::verify($_POST['csrf'] ?? null);
        $item = Item::find((int) ($_POST['id'] ?? 0));
        if ($item === null) {
            throw new ValidationException('Item not found.');
        }
        if (($_POST['action'] ?? '') === 'toggle') {
            Database::getInstance()->execute('UPDATE items SET is_active = 1 - is_active WHERE id = ?', [$item->getId()]);
            adminFlash('ok', $item->getName() . ' updated.');
        } elseif (($_POST['action'] ?? '') === 'delete') {
            $item->delete();   // copies owned by players are removed too (ON DELETE CASCADE)
            adminFlash('ok', $item->getName() . ' deleted (player copies were removed too).');
        }
    } catch (ValidationException $e) {
        adminFlash('error', $e->getMessage());
    } catch (DatabaseException $e) {
        adminFlash('error', DEBUG ? $e->getMessage() : 'Something went wrong.');
    }
    adminRedirect('/views/admin/items.php');
}

$q = trim($_GET['q'] ?? '');
$slot = $_GET['slot'] ?? '';
$rarity = $_GET['rarity'] ?? '';
$sort = $_GET['sort'] ?? 'id';
$dir = $_GET['dir'] ?? 'asc';
$params = ['q' => $q, 'slot' => $slot, 'rarity' => $rarity];

$items = [];
$error = '';
try {
    $items = Item::search($q, $slot, $rarity, $sort, $dir);
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load items.';
}

$pageTitle = 'Manage Items';
require __DIR__ . '/../../includes/header.php';
?>
<h1>Manage Items</h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>
<?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>

<form class="filters" method="get">
    <input type="text" name="q" placeholder="Search name or description" value="<?= h($q) ?>">
    <select name="slot">
        <option value="">All slots</option>
        <?php foreach (Item::SLOTS as $s): ?><option value="<?= $s ?>" <?= $slot === $s ? 'selected' : '' ?>><?= ucfirst($s) ?></option><?php endforeach; ?>
    </select>
    <select name="rarity">
        <option value="">All rarities</option>
        <?php foreach (Item::RARITIES as $r): ?><option value="<?= $r ?>" <?= $rarity === $r ? 'selected' : '' ?>><?= ucfirst($r) ?></option><?php endforeach; ?>
    </select>
    <button class="btn small" type="submit">Filter</button>
    <a class="btn small grey" href="items.php">Reset</a>
    <a class="btn small" href="item_form.php">+ New item</a>
</form>

<div class="panel table-wrap">
<table class="admin-table">
    <tr>
        <th><?= adminSortLink('id', 'ID', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('name', 'Name', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('slot', 'Slot', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('rarity', 'Rarity', $sort, $dir, $params) ?></th>
        <th>Bonuses</th>
        <th><?= adminSortLink('is_active', 'Drops', $sort, $dir, $params) ?></th>
        <th>Actions</th>
    </tr>
    <?php foreach ($items as $it): ?>
        <tr>
            <td><?= $it->getId() ?></td>
            <td><?= h($it->getName()) ?></td>
            <td><?= h($it->getSlot()) ?></td>
            <td style="color:<?= Item::RARITY_COLORS[$it->getRarity()] ?>"><strong><?= h(ucfirst($it->getRarity())) ?></strong></td>
            <td><?= h(Item::statText($it->toArray())) ?></td>
            <td><span class="badge <?= $it->isActive() ? 'on' : '' ?>"><?= $it->isActive() ? 'yes' : 'no' ?></span></td>
            <td>
                <a class="btn small" href="item_form.php?id=<?= $it->getId() ?>">Edit</a>
                <form method="post">
                    <?= Csrf::field() ?><input type="hidden" name="id" value="<?= $it->getId() ?>">
                    <button class="btn small grey" name="action" value="toggle">Toggle</button>
                </form>
                <form method="post" onsubmit="return confirm('Delete <?= h($it->getName()) ?>? Players who own it lose it.');">
                    <?= Csrf::field() ?><input type="hidden" name="id" value="<?= $it->getId() ?>">
                    <button class="btn small danger" name="action" value="delete">Delete</button>
                </form>
            </td>
        </tr>
    <?php endforeach; ?>
    <?php if (!$items): ?><tr><td colspan="7">No items found.</td></tr><?php endif; ?>
</table>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>