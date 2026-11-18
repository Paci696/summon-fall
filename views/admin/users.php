<?php
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        Csrf::verify($_POST['csrf'] ?? null);
        $id = (int) ($_POST['id'] ?? 0);
        if ($id === $currentUser->getId()) {
            throw new ValidationException('You cannot change your own account here.');
        }
        $target = User::find($id);
        if ($target === null) {
            throw new ValidationException('User not found.');
        }
        $db = Database::getInstance();
        $action = $_POST['action'] ?? '';
        if ($action === 'role') {
            $newRole = $target->getRole() === 'admin' ? 'player' : 'admin';
            $db->execute('UPDATE users SET role = ? WHERE id = ?', [$newRole, $id]);
            adminFlash('ok', $target->getUsername() . ' is now ' . $newRole . '.');
        } elseif ($action === 'delete') {
            Inventory::purgeUser($id);   // items, equipment and chosen hero have no foreign key to users
            $target->delete(); // scores and skill levels are removed by ON DELETE CASCADE
            adminFlash('ok', $target->getUsername() . ' deleted.');
        }
    } catch (ValidationException $e) {
        adminFlash('error', $e->getMessage());
    } catch (DatabaseException $e) {
        adminFlash('error', DEBUG ? $e->getMessage() : 'Something went wrong.');
    }
    adminRedirect('/views/admin/users.php');
}

$q = trim($_GET['q'] ?? '');
$role = $_GET['role'] ?? '';
$sort = $_GET['sort'] ?? 'id';
$dir = $_GET['dir'] ?? 'asc';
$params = ['q' => $q, 'role' => $role];

$users = [];
$error = '';
try {
    $users = AdminStats::searchUsers($q, $role, $sort, $dir);
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load users.';
}

$pageTitle = 'Manage Users';
require __DIR__ . '/../../includes/header.php';
?>
<h1>Manage Users</h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>
<?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>

<form class="filters" method="get">
    <input type="text" name="q" placeholder="Search username or email" value="<?= h($q) ?>">
    <select name="role">
        <option value="">All roles</option>
        <option value="player" <?= $role === 'player' ? 'selected' : '' ?>>Player</option>
        <option value="admin" <?= $role === 'admin' ? 'selected' : '' ?>>Admin</option>
    </select>
    <button class="btn small" type="submit">Filter</button>
    <a class="btn small grey" href="users.php">Reset</a>
</form>

<div class="panel table-wrap">
<table class="admin-table">
    <tr>
        <th><?= adminSortLink('id', 'ID', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('username', 'Username', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('email', 'Email', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('role', 'Role', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('souls', 'Souls', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('runs', 'Runs', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('best', 'Best', $sort, $dir, $params) ?></th>
        <th><?= adminSortLink('created_at', 'Joined', $sort, $dir, $params) ?></th>
        <th>Actions</th>
    </tr>
    <?php foreach ($users as $u): $self = (int) $u['id'] === $currentUser->getId(); ?>
        <tr>
            <td><?= $u['id'] ?></td>
            <td><?= h($u['username']) ?></td>
            <td><?= h($u['email']) ?></td>
            <td><span class="badge <?= $u['role'] === 'admin' ? 'admin' : '' ?>"><?= h($u['role']) ?></span></td>
            <td><?= $u['souls'] ?></td>
            <td><?= $u['runs'] ?></td>
            <td><?= $u['best'] ?></td>
            <td><?= h(substr($u['created_at'], 0, 10)) ?></td>
            <td>
                <?php if ($self): ?>
                    <em>you</em>
                <?php else: ?>
                    <form method="post" onsubmit="return confirm('Change role of <?= h($u['username']) ?>?');">
                        <?= Csrf::field() ?><input type="hidden" name="id" value="<?= $u['id'] ?>">
                        <button class="btn small grey" name="action" value="role"><?= $u['role'] === 'admin' ? 'Make player' : 'Make admin' ?></button>
                    </form>
                    <form method="post" onsubmit="return confirm('Delete <?= h($u['username']) ?> and all their runs?');">
                        <?= Csrf::field() ?><input type="hidden" name="id" value="<?= $u['id'] ?>">
                        <button class="btn small danger" name="action" value="delete">Delete</button>
                    </form>
                <?php endif; ?>
            </td>
        </tr>
    <?php endforeach; ?>
    <?php if (!$users): ?><tr><td colspan="9">No users found.</td></tr><?php endif; ?>
</table>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>