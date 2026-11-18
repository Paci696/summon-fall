<?php
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        Csrf::verify($_POST['csrf'] ?? null);
        $skill = Skill::find((int) ($_POST['id'] ?? 0));
        if ($skill === null) {
            throw new ValidationException('Skill not found.');
        }
        $skill->delete();
        adminFlash('ok', $skill->getName() . ' deleted (player levels for it were removed too).');
    } catch (ValidationException $e) {
        adminFlash('error', $e->getMessage());
    } catch (DatabaseException $e) {
        adminFlash('error', DEBUG ? $e->getMessage() : 'Something went wrong.');
    }
    adminRedirect('/views/admin/skills.php');
}

$q = trim($_GET['q'] ?? '');
$branch = $_GET['branch'] ?? '';
$sort = $_GET['sort'] ?? 'id';
$dir = $_GET['dir'] ?? 'asc';
$params = ['q' => $q, 'branch' => $branch];

$skills = [];
$unitNames = [];
$heroNames = [];
$error = '';
try {
    $skills = Skill::search($q, $branch, $sort, $dir);
    foreach (Unit::all() as $u) {
        $unitNames[$u->getId()] = $u->getName();
    }
    foreach (Hero::search('', 'id', 'asc') as $hh) {
        $heroNames[$hh->getId()] = $hh->getName();
    }
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load skills.';
}

$pageTitle = 'Manage Skills';
require __DIR__ . '/../../includes/header.php';
?>
<h1>Manage Skills</h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>
<?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>

<form class="filters" method="get">
    <input type="text" name="q" placeholder="Search name or description" value="<?= h($q) ?>">
    <select name="branch">
        <option value="">All branches</option>
        <?php foreach (Skill::BRANCHES as $b): ?>
            <option value="<?= $b ?>" <?= $branch === $b ? 'selected' : '' ?>><?= ucfirst($b) ?></option>
        <?php endforeach; ?>
    </select>
    <button class="btn small" type="submit">Filter</button>
    <a class="btn small grey" href="skills.php">Reset</a>
    <a class="btn small" href="skill_form.php">+ New skill</a>
</form>

<div class="panel table-wrap">
<table class="admin-table">
    <tr>
        <th><?= adminSortLink('id', 'ID', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('name', 'Name', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('branch', 'Branch', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('tier', 'Tier', $sort, $dir, $params) ?></th>
        <th>Unit / Hero</th>
        <th><?= adminSortLink('stat', 'Stat', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('base_cost', 'Cost', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('max_level', 'Max', $sort, $dir, $params) ?></th>
        <th>Actions</th>
    </tr>
    <?php foreach ($skills as $s): ?>
        <tr>
            <td><?= $s->getId() ?></td>
            <td><?= h($s->getName()) ?></td>
            <td><?= h($s->getBranch()) ?></td>
            <td><?= $s->getTier() ?></td>
            <td><?= $s->getHeroId() ? 'Hero: ' . h($heroNames[$s->getHeroId()] ?? '?') : ($s->getUnitId() ? h($unitNames[$s->getUnitId()] ?? '?') : 'All') ?></td>
            <td><?= h($s->getStat()) ?> (<?= $s->getBonusPerLevel() ?>)</td>
            <td><?= $s->getBaseCost() ?></td>
            <td><?= $s->getMaxLevel() ?></td>
            <td>
                <a class="btn small" href="skill_form.php?id=<?= $s->getId() ?>">Edit</a>
                <form method="post" onsubmit="return confirm('Delete <?= h($s->getName()) ?>?');">
                    <?= Csrf::field() ?><input type="hidden" name="id" value="<?= $s->getId() ?>">
                    <button class="btn small danger">Delete</button>
                </form>
            </td>
        </tr>
    <?php endforeach; ?>
    <?php if (!$skills): ?><tr><td colspan="9">No skills found.</td></tr><?php endif; ?>
</table>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>