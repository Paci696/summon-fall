<?php
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

$id = (int) ($_GET['id'] ?? 0);
$item = null;
if ($id > 0) {
    try {
        $item = Item::find($id);
    } catch (DatabaseException $e) {
        $item = null;
    }
    if ($item === null) {
        adminFlash('error', 'Item not found.');
        adminRedirect('/views/admin/items.php');
    }
}

$numeric = [
    'hp_pct'        => ['HP bonus (%)', 0, 200],
    'damage_pct'    => ['Damage bonus (%)', 0, 200],
    'speed_pct'     => ['Speed bonus (%)', 0, 100],
    'cdr_pct'       => ['Faster abilities (%)', 0, 60],
    'lifesteal_pct' => ['Lifesteal (%)', 0, 50],
];

if ($item) {
    $old = [
        'name' => $item->getName(), 'slot' => $item->getSlot(), 'rarity' => $item->getRarity(),
        'description' => $item->getDescription(), 'hp_pct' => $item->getHpPct(), 'damage_pct' => $item->getDamagePct(),
        'speed_pct' => $item->getSpeedPct(), 'cdr_pct' => $item->getCdrPct(), 'lifesteal_pct' => $item->getLifestealPct(),
        'is_active' => $item->isActive() ? 1 : 0,
    ];
} else {
    $old = [
        'name' => '', 'slot' => 'weapon', 'rarity' => 'common', 'description' => '', 'hp_pct' => 0,
        'damage_pct' => 5, 'speed_pct' => 0, 'cdr_pct' => 0, 'lifesteal_pct' => 0, 'is_active' => 1,
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
        $v->required('name', 'Name')->maxLength('name', 50, 'Name')
          ->maxLength('description', 255, 'Description')
          ->required('slot', 'Slot')->inList('slot', Item::SLOTS, 'Slot')
          ->required('rarity', 'Rarity')->inList('rarity', Item::RARITIES, 'Rarity');
        foreach ($numeric as $field => [$label, $min, $max]) {
            $v->required($field, $label)->integer($field, $min, $max, $label);
        }
        $v->throwIfFails();

        $extra = [];
        if ((int) $old['hp_pct'] + (int) $old['damage_pct'] + (int) $old['speed_pct'] + (int) $old['cdr_pct'] + (int) $old['lifesteal_pct'] === 0) {
            $extra['damage_pct'] = 'Give the item at least one bonus.';
        }
        $dup = Database::getInstance()->fetchOne('SELECT id FROM items WHERE name = ? AND id <> ?', [$old['name'], $id]);
        if ($dup) {
            $extra['name'] = 'Another item already uses that name.';
        }
        if ($extra) {
            throw new ValidationException('Please fix the errors below.', $extra);
        }

        (new Item($old, $id ?: null))->save();

        adminFlash('ok', $old['name'] . ($id ? ' updated.' : ' created.'));
        adminRedirect('/views/admin/items.php');
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
$select = function (string $name, string $label, array $options, string $current) use (&$errors) {
    ?>
    <div>
        <label for="<?= $name ?>"><?= h($label) ?></label>
        <select id="<?= $name ?>" name="<?= $name ?>">
            <?php foreach ($options as $value => $text): ?>
                <option value="<?= h($value) ?>" <?= (string) $value === $current ? 'selected' : '' ?>><?= h($text) ?></option>
            <?php endforeach; ?>
        </select>
        <?php if (isset($errors[$name])): ?><span class="error"><?= h($errors[$name]) ?></span><?php endif; ?>
    </div>
    <?php
};

$pageTitle = $item ? 'Edit Item' : 'New Item';
require __DIR__ . '/../../includes/header.php';
?>
<h1><?= $item ? 'Edit ' . h($item->getName()) : 'New Item' ?></h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>

<div class="card wide">
    <?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>
    <form class="form" method="post" novalidate>
        <?= Csrf::field() ?>
        <div class="form-grid">
            <?php $input('name', 'Name'); ?>
            <?php $input('description', 'Description (optional flavour text)'); ?>
            <?php $select('slot', 'Slot', array_combine(Item::SLOTS, array_map('ucfirst', Item::SLOTS)), (string) $old['slot']); ?>
            <?php $select('rarity', 'Rarity', array_combine(Item::RARITIES, array_map('ucfirst', Item::RARITIES)), (string) $old['rarity']); ?>
            <?php foreach ($numeric as $field => [$label, $min, $max]) { $input($field, $label, 'min="' . $min . '" max="' . $max . '"'); } ?>
        </div>
        <label><input type="checkbox" name="is_active" value="1" <?= $old['is_active'] ? 'checked' : '' ?>> Can drop in the game</label>
        <br>
        <button class="btn" type="submit">Save</button>
        <a class="btn grey" href="items.php">Cancel</a>
    </form>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>