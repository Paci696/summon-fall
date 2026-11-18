<?php
require_once __DIR__ . '/../../includes/admin_check.php';
require_once __DIR__ . '/../../includes/admin_helpers.php';

$id = (int) ($_GET['id'] ?? 0);
$skill = null;
$allSkills = [];
$allUnits = [];
$allHeroes = [];
try {
    $allHeroes = Hero::search('', 'id', 'asc');
    $allSkills = Skill::all();
    $allUnits = Unit::all();
    if ($id > 0) {
        $skill = Skill::find($id);
    }
} catch (DatabaseException $e) {
    adminFlash('error', DEBUG ? $e->getMessage() : 'Could not load data.');
    adminRedirect('/views/admin/skills.php');
}
if ($id > 0 && $skill === null) {
    adminFlash('error', 'Skill not found.');
    adminRedirect('/views/admin/skills.php');
}

if ($skill) {
    $old = [
        'name' => $skill->getName(), 'description' => $skill->getDescription(), 'branch' => $skill->getBranch(),
        'tier' => $skill->getTier(), 'parent_skill_id' => (string) ($skill->getParentSkillId() ?? ''),
        'unit_id' => (string) ($skill->getUnitId() ?? ''), 'hero_id' => (string) ($skill->getHeroId() ?? ''), 'stat' => $skill->getStat(),
        'bonus_per_level' => $skill->getBonusPerLevel(), 'base_cost' => $skill->getBaseCost(),
        'cost_growth' => number_format($skill->getCostGrowth(), 2, '.', ''), 'max_level' => $skill->getMaxLevel(),
    ];
} else {
    $old = [
        'name' => '', 'description' => '', 'branch' => 'warrior', 'tier' => 1, 'parent_skill_id' => '',
        'unit_id' => '', 'hero_id' => '', 'stat' => 'hp', 'bonus_per_level' => 10, 'base_cost' => 5, 'cost_growth' => '1.50', 'max_level' => 5,
    ];
}

$error = '';
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $old = array_merge($old, array_map('trim', array_map('strval', $_POST)));
    try {
        Csrf::verify($_POST['csrf'] ?? null);

        $v = new Validator($old);
        $v->required('name', 'Name')->maxLength('name', 40, 'Name')
          ->required('description', 'Description')->maxLength('description', 160, 'Description')
          ->required('branch', 'Branch')->inList('branch', Skill::BRANCHES, 'Branch')
          ->required('stat', 'Stat')->inList('stat', Skill::STATS, 'Stat')
          ->required('tier', 'Tier')->integer('tier', 1, 10, 'Tier')
          ->required('bonus_per_level', 'Bonus per level')->decimal('bonus_per_level', -100, 1000, 'Bonus per level')
          ->required('base_cost', 'Base cost')->integer('base_cost', 1, 100000, 'Base cost')
          ->required('cost_growth', 'Cost growth')->decimal('cost_growth', 1, 5, 'Cost growth')
          ->required('max_level', 'Max level')->integer('max_level', 1, 20, 'Max level');
        $v->throwIfFails();

        $extra = [];
        $parentId = $old['parent_skill_id'] === '' ? null : (int) $old['parent_skill_id'];
        $unitId = $old['unit_id'] === '' ? null : (int) $old['unit_id'];
        $heroId = $old['hero_id'] === '' ? null : (int) $old['hero_id'];
        if ($old['branch'] === 'hero') {
            $unitId = null;                       // hero skills belong to a hero, never to a unit
            if ($heroId === null || Hero::find($heroId) === null) {
                $extra['hero_id'] = 'Choose the hero this skill belongs to.';
            }
        } else {
            $heroId = null;
        }

        if ($parentId !== null) {
            $parent = Skill::find($parentId);
            if ($parent === null || $parentId === $id) {
                $extra['parent_skill_id'] = 'Choose a valid parent skill.';
            } elseif ($parent->getTier() >= (int) $old['tier']) {
                $extra['parent_skill_id'] = 'The parent must be on a lower tier than this skill.';
            }
        }
        if ($unitId !== null && Unit::find($unitId) === null) {
            $extra['unit_id'] = 'Choose a valid unit.';
        }
        $dup = Database::getInstance()->fetchOne('SELECT id FROM skills WHERE name = ? AND id <> ?', [$old['name'], $id]);
        if ($dup) {
            $extra['name'] = 'Another skill already uses that name.';
        }
        if ($extra) {
            throw new ValidationException('Please fix the errors below.', $extra);
        }

        $data = $old;
        $data['parent_skill_id'] = $parentId;
        $data['unit_id'] = $unitId;
        $data['hero_id'] = $heroId;
        (new Skill($data, $id ?: null))->save();

        adminFlash('ok', $old['name'] . ($id ? ' updated.' : ' created.'));
        adminRedirect('/views/admin/skills.php');
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

$branchOpts = array_combine(Skill::BRANCHES, array_map('ucfirst', Skill::BRANCHES));
$statOpts = array_combine(Skill::STATS, Skill::STATS);
$parentOpts = ['' => '(none)'];
foreach ($allSkills as $s) {
    if ($s->getId() !== $id) {
        $parentOpts[$s->getId()] = $s->getName() . ' (tier ' . $s->getTier() . ')';
    }
}
$heroOpts = ['' => '(not a hero skill)'];
foreach ($allHeroes as $hh) {
    $heroOpts[$hh->getId()] = $hh->getName();
}
$unitOpts = ['' => '(all units / global)'];
foreach ($allUnits as $u) {
    $unitOpts[$u->getId()] = $u->getName();
}

$pageTitle = $skill ? 'Edit Skill' : 'New Skill';
require __DIR__ . '/../../includes/header.php';
?>
<h1><?= $skill ? 'Edit ' . h($skill->getName()) : 'New Skill' ?></h1>
<?php require __DIR__ . '/../../includes/admin_nav.php'; ?>

<div class="card wide">
    <?php if ($error): ?><div class="alert"><?= h($error) ?></div><?php endif; ?>
    <form class="form" method="post" novalidate>
        <?= Csrf::field() ?>
        <div class="form-grid">
            <?php $input('name', 'Name'); ?>
            <?php $input('description', 'Description'); ?>
            <?php $select('branch', 'Branch', $branchOpts, (string) $old['branch']); ?>
            <?php $input('tier', 'Tier (row in the tree)', 'min="1" max="10"'); ?>
            <?php $select('parent_skill_id', 'Requires (parent skill)', $parentOpts, (string) $old['parent_skill_id']); ?>
            <?php $select('unit_id', 'Affects unit', $unitOpts, (string) $old['unit_id']); ?>
            <?php $select('hero_id', 'Affects hero (branch Hero only)', $heroOpts, (string) $old['hero_id']); ?>
            <?php $select('stat', 'Stat', $statOpts, (string) $old['stat']); ?>
            <?php $input('bonus_per_level', 'Bonus per level (% or flat gold; hero stats: hp, damage, speed, cdr, ability, revive are %)', 'step="0.01"'); ?>
            <?php $input('base_cost', 'Base cost (souls)', 'min="1"'); ?>
            <?php $input('cost_growth', 'Cost growth (e.g. 1.50)', 'step="0.01" min="1" max="5"'); ?>
            <?php $input('max_level', 'Max level', 'min="1" max="20"'); ?>
        </div>
        <button class="btn" type="submit">Save</button>
        <a class="btn grey" href="skills.php">Cancel</a>
    </form>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>