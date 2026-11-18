<?php
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

$id = (int) ($_GET['id'] ?? 0);
$hero = null;
try {
    $hero = $id > 0 ? Hero::find($id) : null;
} catch (DatabaseException $e) {
    $hero = null;
}
if ($hero === null) {
    adminFlash('error', 'Hero not found. Heroes cannot be added here because each one needs a coded sprite.');
    adminRedirect('/views/admin/heroes.php');
}

$numeric = [
    'hp'              => ['HP', 1, 1000000],
    'damage'          => ['Damage', 0, 100000],
    'speed'           => ['Speed (px/s)', 1, 1000],
    'attack_range'    => ['Attack range (px)', 0, 2000],
    'attack_cooldown' => ['Attack cooldown (ms)', 100, 60000],
    'revive_sec'      => ['Revive time (seconds)', 5, 600],
];

$old = [
    'description' => $hero->getDescription(), 'hp' => $hero->getHp(), 'damage' => $hero->getDamage(),
    'speed' => $hero->getSpeed(), 'attack_range' => $hero->getAttackRange(),
    'attack_cooldown' => $hero->getAttackCooldown(), 'revive_sec' => $hero->getReviveSec(),
    'is_active' => $hero->isActive() ? 1 : 0,
];
$abilities = $hero->abilities();
foreach ($abilities as $a) {
    $s = $a['slot'];
    $old["a{$s}_cooldown"] = $a['cooldown_sec'];
    $old["a{$s}_power"] = $a['power'];
    $old["a{$s}_radius"] = $a['radius'];
    $old["a{$s}_duration"] = $a['duration_sec'];
}

$error = '';
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $old = array_merge($old, array_map('trim', array_map('strval', $_POST)));
    $old['is_active'] = isset($_POST['is_active']) ? 1 : 0;
    try {
        Csrf::verify($_POST['csrf'] ?? null);

        $v = new Validator($old);
        $v->required('description', 'Description')->maxLength('description', 255, 'Description');
        foreach ($numeric as $field => [$label, $min, $max]) {
            $v->required($field, $label)->integer($field, $min, $max, $label);
        }
        foreach ($abilities as $a) {
            $s = $a['slot'];
            $n = $a['name'];
            $v->required("a{$s}_cooldown", "$n cooldown")->integer("a{$s}_cooldown", 1, 600, "$n cooldown")
              ->required("a{$s}_power", "$n power")->integer("a{$s}_power", 0, 10000, "$n power")
              ->required("a{$s}_radius", "$n radius")->integer("a{$s}_radius", 0, 500, "$n radius")
              ->required("a{$s}_duration", "$n duration")->integer("a{$s}_duration", 0, 120, "$n duration");
        }
        $v->throwIfFails();

        if (!$old['is_active']) {
            $others = Database::getInstance()->fetchOne('SELECT COUNT(*) AS c FROM heroes WHERE is_active = 1 AND id <> ?', [$id]);
            if ((int) $others['c'] === 0) {
                throw new ValidationException('Please fix the errors below.', ['is_active' => 'At least one hero must stay active.']);
            }
        }

        $db = Database::getInstance();
        $data = $old;
        $data['name'] = $hero->getName();            // the name decides the hero class, so it is not editable
        $data['sprite_key'] = $hero->getSpriteKey();
        try {
            $db->beginTransaction();
            Hero::make($data, $id)->save();
            foreach ($abilities as $a) {
                $s = $a['slot'];
                Hero::updateAbility($id, $s, (int) $old["a{$s}_cooldown"], (int) $old["a{$s}_power"], (int) $old["a{$s}_radius"], (int) $old["a{$s}_duration"]);
            }
            $db->commit();
        } catch (DatabaseException $e) {
            $db->rollBack();
            throw $e;
        }

        adminFlash('ok', $hero->getName() . ' updated.');
        adminRedirect('/views/admin/heroes.php');
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

$pageTitle = 'Edit Hero';
require __DIR__ . '/../../includes/header.php';
?>
<h1>Edit <?= h($hero->getName()) ?> <small>(<?= h($hero->getRole()) ?>, <?= h($hero->getAttackType()) ?>)</small></h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>

<div class="card wide">
    <?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>
    <form class="form" method="post" novalidate>
        <?= Csrf::field() ?>
        <h2>Stats</h2>
        <div class="form-grid">
            <?php $input('description', 'Description'); ?>
            <?php foreach ($numeric as $field => [$label, $min, $max]) { $input($field, $label, 'min="' . $min . '" max="' . $max . '"'); } ?>
        </div>
        <?php foreach ($abilities as $a): $s = $a['slot']; ?>
            <h2>Ability <?= $s ?>: <?= h($a['name']) ?> <small>(<?= h($a['ability_type']) ?>)</small></h2>
            <div class="form-grid">
                <?php $input("a{$s}_cooldown", 'Cooldown (seconds)', 'min="1" max="600"'); ?>
                <?php $input("a{$s}_power", 'Power (damage, heal or % effect)', 'min="0" max="10000"'); ?>
                <?php $input("a{$s}_radius", 'Radius (px)', 'min="0" max="500"'); ?>
                <?php $input("a{$s}_duration", 'Duration (seconds)', 'min="0" max="120"'); ?>
            </div>
        <?php endforeach; ?>
        <label><input type="checkbox" name="is_active" value="1" <?= $old['is_active'] ? 'checked' : '' ?>> Active (can be chosen by players)</label>
        <?php if (isset($errors['is_active'])): ?><span class="error"><?= h($errors['is_active']) ?></span><?php endif; ?>
        <br>
        <button class="btn" type="submit">Save</button>
        <a class="btn grey" href="heroes.php">Cancel</a>
    </form>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>