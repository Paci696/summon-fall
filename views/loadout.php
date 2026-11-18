<?php
require_once __DIR__ . '/../includes/auth_check.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        Csrf::verify($_POST['csrf'] ?? null);
        Loadout::save($currentUser->getId(), (array) ($_POST['slot'] ?? []));
        $_SESSION['flash'] = ['ok', 'Loadout saved.'];
    } catch (ValidationException $e) {
        $_SESSION['flash'] = ['error', $e->getMessage()];
    } catch (DatabaseException $e) {
        $_SESSION['flash'] = ['error', DEBUG ? $e->getMessage() : 'Something went wrong. Please try again.'];
    }
    header('Location: ' . BASE_URL . '/views/loadout.php');
    exit;
}

$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);

$units = [];
$current = [];
$error = '';
try {
    $units = Unit::availableForUser($currentUser->getId());
    $current = Loadout::idsFor($currentUser->getId());
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load your units.';
}
if (!$current) {
    // No saved loadout yet: show what the game uses by default
    $current = array_slice(array_map(fn($u) => $u->getId(), $units), 0, Loadout::SLOTS);
}

$pageTitle = 'Loadout';
require __DIR__ . '/../includes/header.php';
?>
<section class="hero">
    <h1>Loadout</h1>
    <p>Choose which units sit on your summon bar. Slot 1 is key 1, slot 10 is key 0.</p>
</section>

<?php if ($flash): ?>
    <div class="alert <?= $flash[0] === 'ok' ? 'ok' : '' ?>"><?= htmlspecialchars($flash[1]) ?></div>
<?php endif; ?>
<?php if ($error): ?><div class="alert"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<form method="post">
    <?= Csrf::field() ?>
    <div class="loadout-grid">
        <?php for ($i = 0; $i < Loadout::SLOTS; $i++): ?>
            <label class="slot">
                <span class="key"><?= $i === 9 ? 0 : $i + 1 ?></span>
                <select name="slot[]">
                    <option value="0">- empty -</option>
                    <?php foreach ($units as $u): ?>
                        <option value="<?= $u->getId() ?>" <?= ($current[$i] ?? 0) === $u->getId() ? 'selected' : '' ?>>
                            <?= htmlspecialchars($u->getName()) ?> (<?= $u->getCost() ?> gold)
                        </option>
                    <?php endforeach; ?>
                </select>
            </label>
        <?php endfor; ?>
    </div>
    <p style="text-align:center">
        <button class="btn" type="submit">Save loadout</button>
        <a class="btn grey" href="<?= BASE_URL ?>/views/menu.php">Back to menu</a>
    </p>
</form>
<?php require __DIR__ . '/../includes/footer.php'; ?>