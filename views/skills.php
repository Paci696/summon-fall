<?php
require_once __DIR__ . '/../includes/auth_check.php';

$lines = ['miner' => 'Miner', 'swordsman' => 'Swordsman', 'archer' => 'Archer', 'mage' => 'Mage', 'healer' => 'Healer'];
$tierNames = [0 => 'Base', 1 => 'Elite', 2 => 'Godly'];

// Every skill as a plain array for the tree, with the state (open, locked, maxed) worked out on the server
function buildSkillNodes(User $user, array $tierNames): array
{
    $rows = Skill::allWithLevels($user->getId());
    $levelById = [];
    $nameById = [];
    $grid = [];
    foreach ($rows as $r) {
        $s = $r['skill'];
        $levelById[$s->getId()] = $r['level'];
        $nameById[$s->getId()] = $s->getName();
        if ($s->getUnitLine() !== null && $s->getHeroId() === null) {
            $grid[$s->getUnitTier()][$s->getUnitLine()][] = $r;
        }
    }
    $tierDone = function (string $line, int $tier) use ($grid): bool {
        foreach ($grid[$tier][$line] ?? [] as $r) {
            if ($r['level'] < $r['skill']->getMaxLevel()) {
                return false;
            }
        }
        return true;
    };

    $nodes = [];
    foreach ($rows as $r) {
        $s = $r['skill'];
        $lvl = $r['level'];
        $parentId = $s->getParentSkillId();
        $unlocked = $parentId === null || ($levelById[$parentId] ?? 0) > 0;
        $needs = 'Needs ' . ($nameById[$parentId] ?? 'previous skill');
        $gate = $s->getUnlocksUnitId() !== null && $s->getUnitTier() > 0;
        if ($gate && !$tierDone((string) $s->getUnitLine(), $s->getUnitTier() - 1)) {
            $unlocked = false;
            $needs = 'Max all ' . $tierNames[$s->getUnitTier() - 1] . ' upgrades first';
        }
        $maxed = $lvl >= $s->getMaxLevel();
        if ($s->getHeroId() !== null) {
            $group = 'hero:' . $s->getHeroId();
        } elseif ($s->getUnitLine() !== null) {
            $group = 'line:' . $s->getUnitLine();
        } else {
            $group = 'general';
        }
        $nodes[] = [
            'id' => $s->getId(), 'name' => $s->getName(), 'desc' => $s->getDescription(), 'stat' => $s->getStat(),
            'tier' => $s->getTier(), 'utier' => $s->getHeroId() !== null ? 0 : $s->getUnitTier(), 'group' => $group,
            'parent' => $parentId, 'gate' => $gate, 'level' => $lvl, 'max' => $s->getMaxLevel(),
            'cost' => $s->costForLevel($lvl), 'state' => $maxed ? 'maxed' : ($unlocked ? 'open' : 'locked'), 'needs' => $needs,
        ];
    }
    return $nodes;
}

function currentSouls(User $user): int
{
    $row = Database::getInstance()->fetchOne('SELECT souls FROM users WHERE id = ?', [$user->getId()]);
    return (int) ($row['souls'] ?? 0);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ajax = ($_POST['ajax'] ?? '') === '1';
    $ok = false;
    try {
        Csrf::verify($_POST['csrf'] ?? null);
        $result = Skill::purchase($currentUser, (int) ($_POST['skill_id'] ?? 0));
        $message = $result['name'] . ' is now level ' . $result['level'] . '.';
        $ok = true;
    } catch (ValidationException $e) {
        $message = $e->getMessage();
    } catch (DatabaseException $e) {
        $message = DEBUG ? $e->getMessage() : 'Something went wrong. Please try again.';
    }
    if ($ajax) {
        header('Content-Type: application/json');
        $out = ['ok' => $ok, 'message' => $message, 'csrf' => Csrf::field()];
        try {
            $out['nodes'] = buildSkillNodes($currentUser, $tierNames);
            $out['souls'] = currentSouls($currentUser);
        } catch (DatabaseException $e) {
            $out['ok'] = false;
        }
        echo json_encode($out);
        exit;
    }
    $_SESSION['flash'] = [$ok ? 'ok' : 'error', $message];
    header('Location: ' . BASE_URL . '/views/skills.php');
    exit;
}

$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);

$error = '';
$nodes = [];
$heroes = [];
try {
    $nodes = buildSkillNodes($currentUser, $tierNames);
    $heroes = Hero::activeAll();
} catch (DatabaseException $e) {
    $error = DEBUG ? $e->getMessage() : 'Could not load skills.';
}

$groups = [];
foreach ($lines as $key => $label) {
    $groups[] = ['key' => 'line:' . $key, 'label' => $label, 'kind' => 'unit'];
}
$groups[] = ['key' => 'general', 'label' => 'General', 'kind' => 'unit'];
foreach ($heroes as $h) {
    $groups[] = ['key' => 'hero:' . $h->getId(), 'label' => $h->getName(), 'kind' => 'hero'];
}
$payload = [
    'souls' => currentSouls($currentUser),
    'nodes' => $nodes,
    'groups' => $groups,
    'heroes' => array_map(fn($h) => ['id' => $h->getId(), 'sprite_key' => $h->getSpriteKey()], $heroes),
];

$pageTitle = 'Skill Tree';
require __DIR__ . '/../includes/header.php';
?>
<link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/skilltree.css?v=<?= @filemtime(BASE_PATH . '/assets/css/skilltree.css') ?: 1 ?>">

<?php if ($flash): ?>
    <div class="alert <?= $flash[0] === 'ok' ? 'ok' : '' ?>"><?= htmlspecialchars($flash[1]) ?></div>
<?php endif; ?>
<?php if ($error): ?><div class="alert"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="st">
    <div class="st-stage">
        <div class="st-top">
            <div class="st-tabs">
                <button class="st-tab" type="button" data-tab="units">Units</button>
                <button class="st-tab" type="button" data-tab="heroes">Heroes</button>
                <span class="st-souls">Souls: <strong><?= $payload['souls'] ?></strong></span>
            </div>
            <div class="st-groups"></div>
        </div>
        <div class="st-hint">Drag to move &middot; scroll to zoom &middot; double-click to reset &middot; click a skill to select it</div>
        <div class="st-panel">Loading skills...</div>
    </div>
    <form id="st-csrf" onsubmit="return false"><?= Csrf::field() ?></form>
</div>

<script>window.SKILL_TREE = <?= json_encode($payload, JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
<script type="module" src="<?= BASE_URL ?>/assets/js/skilltree.js?v=<?= @filemtime(BASE_PATH . '/assets/js/skilltree.js') ?: 1 ?>"></script>
<?php require __DIR__ . '/../includes/footer.php'; ?>