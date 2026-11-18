<?php
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

$id = (int) ($_GET['id'] ?? 0);
$unit = null;
if ($id <= 0) {   // adding units is turned off: every unit needs a sprite
    adminFlash('error', 'New units cannot be added here because each unit needs a sprite. Edit an existing unit instead.');
    adminRedirect('/views/admin/units.php');
}
if ($id > 0) {
    try {
        $unit = Unit::find($id);
    } catch (DatabaseException $e) {
        $unit = null;
    }
    if ($unit === null) {
        adminFlash('error', 'Unit not found.');
        adminRedirect('/views/admin/units.php');
    }
}

$numeric = [
    'cost'            => ['Cost (gold)', 0, 100000],
    'hp'              => ['HP', 1, 1000000],
    'damage'          => ['Damage', 0, 100000],
    'speed'           => ['Speed (px/s)', 0, 1000],
    'attack_range'    => ['Attack range (px)', 0, 2000],
    'attack_cooldown' => ['Attack cooldown (ms)', 100, 60000],
    'drop_souls'      => ['Drop souls', 0, 1000],
    'first_wave'      => ['First wave', 1, 1000],
    'spawn_weight'    => ['Spawn weight', 0, 1000],
];

if ($unit) {
    $old = [
        'name' => $unit->getName(), 'class_type' => $unit->getClassType(), 'faction' => $unit->getFaction(),
        'cost' => $unit->getCost(), 'hp' => $unit->getHp(), 'damage' => $unit->getDamage(),
        'speed' => $unit->getSpeed(), 'attack_range' => $unit->getAttackRange(),
        'attack_cooldown' => $unit->getAttackCooldown(), 'sprite_key' => $unit->getSpriteKey(),
        'drop_souls' => $unit->getDropSouls(), 'drop_chance' => number_format($unit->getDropChance(), 2, '.', ''),
        'first_wave' => $unit->getFirstWave(), 'spawn_weight' => $unit->getSpawnWeight(),
        'is_active' => $unit->isActive() ? 1 : 0,
    ];
} else {
    $old = [
        'name' => '', 'class_type' => 'slime', 'faction' => 'mob', 'cost' => 0, 'hp' => 50, 'damage' => 5,
        'speed' => 40, 'attack_range' => 20, 'attack_cooldown' => 1000, 'sprite_key' => '',
        'drop_souls' => 1, 'drop_chance' => '0.50', 'first_wave' => 1, 'spawn_weight' => 5, 'is_active' => 1,
    ];
}

$error = '';
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $old = array_merge($old, array_map('trim', array_map('strval', $_POST)));
    $old['is_active'] = isset($_POST['is_active']) ? 1 : 0;
    try {
        Csrf::verify($_POST['csrf'] ?? null);

        $v = new Validator($old);
        $v->required('name', 'Name')->maxLength('name', 40, 'Name')
          ->required('class_type', 'Type')->inList('class_type', Unit::types(), 'Type')
          ->required('faction', 'Faction')->inList('faction', ['player', 'mob'], 'Faction')
          ->required('sprite_key', 'Sprite key')->maxLength('sprite_key', 40, 'Sprite key')
          ->pattern('sprite_key', '/^[a-z0-9_]+$/', 'Sprite key: lowercase letters, numbers and underscores only.')
          ->required('drop_chance', 'Drop chance')->decimal('drop_chance', 0, 1, 'Drop chance');
        foreach ($numeric as $field => [$label, $min, $max]) {
            $v->required($field, $label)->integer($field, $min, $max, $label);
        }
        $v->throwIfFails();

        $dup = Database::getInstance()->fetchOne('SELECT id FROM units WHERE name = ? AND id <> ?', [$old['name'], $id]);
        if ($dup) {
            throw new ValidationException('Please fix the errors below.', ['name' => 'Another unit already uses that name.']);
        }

        $data = $old;
        $data['drop_chance'] = round((float) $old['drop_chance'], 2);
        Unit::make($data, $id ?: null)->save();

        adminFlash('ok', $old['name'] . ($id ? ' updated.' : ' created.'));
        adminRedirect('/views/admin/units.php');
    } catch (ValidationException $e) {
        $error = $e->getMessage();
        $errors = $e->getErrors();
    } catch (DatabaseException $e) {
        $error = DEBUG ? $e->getMessage() : 'Something went wrong. Please try again.';
    }
}

$input = function (string $name, string $label, string $extra = '') use (&$old, &$errors) {
    ?>
    <div>
        <label for="<?= $name ?>"><?= h($label) ?></label>
        <input id="<?= $name ?>" name="<?= $name ?>" type="<?= $extra ? 'number' : 'text' ?>" <?= $extra ?> value="<?= h($old[$name] ?? '') ?>">
        <?php if (isset($errors[$name])): ?><span class="error"><?= h($errors[$name]) ?></span><?php endif; ?>
    </div>
    <?php
};

$pageTitle = $unit ? 'Edit Unit' : 'New Unit';
require __DIR__ . '/../../includes/header.php';
?>
<h1><?= $unit ? 'Edit ' . h($unit->getName()) : 'New Unit' ?></h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>

<div class="card wide">
    <?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>
    <form class="form" method="post" novalidate>
        <?= Csrf::field() ?>
        <div class="form-grid">
            <?php $input('name', 'Name'); ?>
            <div>
                <label for="class_type">Type (decides behaviour)</label>
                <select id="class_type" name="class_type">
                    <?php foreach (Unit::types() as $t): ?>
                        <option value="<?= $t ?>" <?= $old['class_type'] === $t ? 'selected' : '' ?>><?= $t ?></option>
                    <?php endforeach; ?>
                </select>
                <?php if (isset($errors['class_type'])): ?><span class="error"><?= h($errors['class_type']) ?></span><?php endif; ?>
            </div>
            <div>
                <label for="faction">Faction</label>
                <select id="faction" name="faction">
                    <option value="player" <?= $old['faction'] === 'player' ? 'selected' : '' ?>>player</option>
                    <option value="mob" <?= $old['faction'] === 'mob' ? 'selected' : '' ?>>mob</option>
                </select>
                <?php if (isset($errors['faction'])): ?><span class="error"><?= h($errors['faction']) ?></span><?php endif; ?>
            </div>
            <?php $input('sprite_key', 'Sprite key (file name)'); ?>
            <?php foreach ($numeric as $field => [$label, $min, $max]) { $input($field, $label, 'min="' . $min . '" max="' . $max . '"'); } ?>
            <?php $input('drop_chance', 'Drop chance (0 to 1)', 'step="0.01" min="0" max="1"'); ?>
        </div>
        <label><input type="checkbox" name="is_active" value="1" <?= $old['is_active'] ? 'checked' : '' ?>> Active (available in the game)</label>
        <button class="btn" type="submit">Save</button>
        <a class="btn grey" href="units.php">Cancel</a>
    </form>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>