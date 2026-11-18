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
$all = [];
$current = [];
$error = '';
try {
    $units = Unit::availableForUser($currentUser->getId());     // units this player has unlocked
    $all = Unit::activeByFaction('player');                      // every player unit (locked ones are shown greyed out)
    $current = Loadout::idsFor($currentUser->getId());
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load your units.';
}
if (!$current) {
    // No saved loadout yet: show what the game uses by default
    $current = array_slice(array_map(fn($u) => $u->getId(), $units), 0, Loadout::SLOTS);
}

$unlocked = array_map(fn($u) => $u->getId(), $units);
$cards = array_map(fn($u) => [
    'id'     => $u->getId(),
    'name'   => $u->getName(),
    'line'   => $u->getUnitLine() ?? $u->getClassType(),
    'tier'   => $u->getTier(),
    'cost'   => $u->getCost(),
    'hp'     => $u->getHp(),
    'damage' => $u->getDamage(),
    'sprite' => $u->getSpriteKey(),
    'locked' => !in_array($u->getId(), $unlocked, true),
], $all);

$defaults = array_slice($unlocked, 0, Loadout::SLOTS);
$data = [
    'slots'    => Loadout::SLOTS,
    'current'  => array_values(array_map('intval', $current)),
    'defaults' => array_values($defaults),
    'units'    => $cards,
    'baseUrl'  => BASE_URL,
];

$pageTitle = 'Loadout';
require __DIR__ . '/../includes/header.php';
?>
<section class="hero">
    <h1>Loadout</h1>
    <p>Build your summon bar. Click a slot, then click a unit, or drag units onto the bar. Slot 1 is key 1, slot 10 is key 0.</p>
</section>

<?php if ($flash): ?>
    <div class="alert <?= $flash[0] === 'ok' ? 'ok' : '' ?>"><?= htmlspecialchars($flash[1]) ?></div>
<?php endif; ?>
<?php if ($error): ?><div class="alert"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<form method="post" id="loadout-form" class="lo">
    <?= Csrf::field() ?>

    <div class="panel">
        <h2>Summon bar <small id="lo-count" class="lo-count"></small></h2>
        <div id="lo-bar" class="lo-bar"></div>
        <div id="lo-hidden"></div>
    </div>

    <div class="panel">
        <h2>Your units</h2>
        <div id="lo-units"></div>
    </div>

    <div class="lo-actions">
        <button class="btn" type="submit">Save loadout</button>
        <button class="btn grey" type="button" id="lo-default">Reset to default</button>
        <button class="btn grey" type="button" id="lo-clear">Clear all</button>
        <a class="btn grey" href="<?= BASE_URL ?>/views/menu.php">Back to menu</a>
    </div>
    <p id="lo-dirty" class="lo-dirty" hidden>You have unsaved changes.</p>
    <noscript><div class="alert">This page needs JavaScript to edit the loadout.</div></noscript>
</form>

<script>window.LOADOUT = <?= json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
<script type="module" src="<?= BASE_URL ?>/assets/js/game/loadout.js"></script>
<?php require __DIR__ . '/../includes/footer.php'; ?>