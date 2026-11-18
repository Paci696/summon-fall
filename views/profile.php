<?php
require_once __DIR__ . '/../includes/auth_check.php';
require_once __DIR__ . '/../includes/admin_helpers.php';

$errors = [];
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        Csrf::verify($_POST['csrf'] ?? null);

        $v = new Validator($_POST);
        $v->required('current_password', 'Current password')
          ->required('new_password', 'New password')->minLength('new_password', 6, 'New password')
          ->matches('new_password', 'confirm', 'Passwords do not match.');
        $v->throwIfFails();

        if (!$currentUser->verifyPassword($_POST['current_password'])) {
            throw new ValidationException('Please fix the errors below.', ['current_password' => 'Current password is incorrect.']);
        }

        $currentUser->setPassword($_POST['new_password']);
        $currentUser->save();
        adminFlash('ok', 'Password changed.');
        adminRedirect('/views/profile.php');
    } catch (ValidationException $e) {
        $error = $e->getMessage();
        $errors = $e->getErrors();
    } catch (DatabaseException $e) {
        $error = DEBUG ? $e->getMessage() : 'Something went wrong. Please try again.';
    }
}

$flash = adminTakeFlash();

$stats = ['runs' => 0, 'best' => 0, 'bestWave' => 0, 'kills' => 0, 'souls' => 0, 'seconds' => 0, 'rank' => null];
$recent = [];
$owned = [];
$joined = '';
$loadError = '';
try {
    $uid = $currentUser->getId();
    $db = Database::getInstance();
    $stats = Score::statsFor($uid);
    $recent = Score::recentFor($uid, 10);
    $owned = $db->fetchAll(
        'SELECT s.name, s.branch, ps.level, s.max_level FROM player_skills ps
         JOIN skills s ON s.id = ps.skill_id WHERE ps.user_id = ? ORDER BY s.branch, s.tier',
        [$uid]
    );
    $row = $db->fetchOne('SELECT created_at FROM users WHERE id = ?', [$uid]);
    $joined = $row ? substr($row['created_at'], 0, 10) : '';
} catch (DatabaseException $e) {
    $loadError = DEBUG ? $e->getMessage() : 'Could not load your stats.';
}

$hours = intdiv($stats['seconds'], 3600);
$mins = intdiv($stats['seconds'] % 3600, 60);

$pageTitle = 'Profile';
require __DIR__ . '/../includes/header.php';
?>
<section class="hero">
    <h1><?= h($currentUser->getUsername()) ?></h1>
    <p><?= h($currentUser->getEmail()) ?> &middot; <?= h($currentUser->getRole()) ?> &middot; joined <?= h($joined) ?></p>
</section>

<?php if ($flash): ?><div class="alert <?= $flash[0] === 'ok' ? 'ok' : '' ?>"><?= h($flash[1]) ?></div><?php endif; ?>
<?php if ($loadError): ?><div class="alert"><?= h($loadError) ?></div><?php endif; ?>

<div class="tiles">
    <div class="tile"><strong><?= $currentUser->getSouls() ?></strong><span>Souls to spend</span></div>
    <div class="tile"><strong><?= $stats['rank'] !== null ? '#' . $stats['rank'] : '-' ?></strong><span>Leaderboard rank</span></div>
    <div class="tile"><strong><?= $stats['best'] ?></strong><span>Best score</span></div>
    <div class="tile"><strong><?= $stats['bestWave'] ?></strong><span>Best wave</span></div>
    <div class="tile"><strong><?= $stats['runs'] ?></strong><span>Runs played</span></div>
    <div class="tile"><strong><?= $stats['kills'] ?></strong><span>Total kills</span></div>
    <div class="tile"><strong><?= $stats['souls'] ?></strong><span>Souls earned</span></div>
    <div class="tile"><strong><?= $hours ?>h <?= $mins ?>m</strong><span>Time played</span></div>
</div>

<div class="two-col">
    <div class="panel">
        <h2>Recent runs</h2>
        <div class="table-wrap"><table class="admin-table">
            <tr><th>Score</th><th>Waves</th><th>Kills</th><th>Souls</th><th>When</th></tr>
            <?php foreach ($recent as $r): ?>
                <tr><td><?= $r['score'] ?></td><td><?= $r['waves_reached'] ?></td><td><?= $r['kills'] ?></td><td><?= $r['souls_earned'] ?></td><td><?= h(substr($r['played_at'], 0, 16)) ?></td></tr>
            <?php endforeach; ?>
            <?php if (!$recent): ?><tr><td colspan="5">No runs yet. Go play!</td></tr><?php endif; ?>
        </table></div>
    </div>
    <div class="panel">
        <h2>Your skills</h2>
        <div class="table-wrap"><table class="admin-table">
            <tr><th>Skill</th><th>Branch</th><th>Level</th></tr>
            <?php foreach ($owned as $s): ?>
                <tr><td><?= h($s['name']) ?></td><td><?= h($s['branch']) ?></td><td><?= $s['level'] ?>/<?= $s['max_level'] ?></td></tr>
            <?php endforeach; ?>
            <?php if (!$owned): ?><tr><td colspan="3">No skills bought yet.</td></tr><?php endif; ?>
        </table></div>
        <a class="btn small" href="skills.php">Open skill tree</a>
    </div>
</div>

<div class="card wide">
    <h2>Change password</h2>
    <?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>
    <form class="form" method="post" novalidate>
        <?= Csrf::field() ?>
        <label for="current_password">Current password</label>
        <input id="current_password" name="current_password" type="password">
        <?php if (isset($errors['current_password'])): ?><span class="error"><?= h($errors['current_password']) ?></span><?php endif; ?>

        <label for="new_password">New password</label>
        <input id="new_password" name="new_password" type="password">
        <?php if (isset($errors['new_password'])): ?><span class="error"><?= h($errors['new_password']) ?></span><?php endif; ?>

        <label for="confirm">Confirm new password</label>
        <input id="confirm" name="confirm" type="password">
        <?php if (isset($errors['confirm'])): ?><span class="error"><?= h($errors['confirm']) ?></span><?php endif; ?>

        <button class="btn" type="submit">Update password</button>
    </form>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>