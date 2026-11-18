<?php
require_once __DIR__ . '/../includes/auth_check.php';

$uid = $currentUser->getId();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        Csrf::verify($_POST['csrf'] ?? null);
        $action = $_POST['action'] ?? '';
        $heroId = (int) ($_POST['hero_id'] ?? 0);
        if ($action === 'select') {
            Hero::select($uid, $heroId);
            $_SESSION['flash'] = ['ok', 'Hero selected.'];
        } elseif ($action === 'equip') {
            Inventory::equip($uid, $heroId, (int) ($_POST['player_item_id'] ?? 0));
            $_SESSION['flash'] = ['ok', 'Item equipped.'];
        } elseif ($action === 'unequip') {
            Inventory::unequip($uid, $heroId, (string) ($_POST['slot'] ?? ''));
            $_SESSION['flash'] = ['ok', 'Item removed.'];
        } elseif ($action === 'discard') {
            Inventory::discard($uid, (int) ($_POST['player_item_id'] ?? 0));
            $_SESSION['flash'] = ['ok', 'Item discarded.'];
        }
    } catch (ValidationException $e) {
        $_SESSION['flash'] = ['error', $e->getMessage()];
    } catch (DatabaseException $e) {
        $_SESSION['flash'] = ['error', DEBUG ? $e->getMessage() : 'Something went wrong. Please try again.'];
    }
    header('Location: ' . BASE_URL . '/views/heroes.php?hero=' . $heroId);
    exit;
}

$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);

$heroes = Hero::activeAll();
$selected = Hero::selectedFor($uid);
$viewId = (int) ($_GET['hero'] ?? $selected->getId());
$view = Hero::byId($viewId) ?? $selected;
$equipped = Inventory::equipped($uid, $view->getId());
$totals = Inventory::totals($uid, $view->getId());
$inventory = Inventory::forUser($uid);
$bySlot = ['weapon' => [], 'armor' => [], 'trinket' => []];
foreach ($inventory as $it) {
    $bySlot[$it['slot']][] = $it;
}
$colors = Item::RARITY_COLORS;
$maxOf = ['hp' => 1, 'damage' => 1, 'speed' => 1, 'range' => 1];
foreach ($heroes as $h) {
    $maxOf['hp'] = max($maxOf['hp'], $h->getHp());
    $maxOf['damage'] = max($maxOf['damage'], $h->getDamage());
    $maxOf['speed'] = max($maxOf['speed'], $h->getSpeed());
    $maxOf['range'] = max($maxOf['range'], $h->getAttackRange());
}
$bar = function (string $label, int $value, int $max, string $color, string $bonus = ''): string {
    $w = max(6, (int) round($value / $max * 100));
    return '<div class="stat"><span class="sl">' . $label . '</span><span class="sb"><i style="width:' . $w . '%;background:' . $color . '"></i></span>'
         . '<span class="sv">' . $value . ($bonus !== '' ? ' <em>' . $bonus . '</em>' : '') . '</span></div>';
};
$abilityColor = ['dash' => '#ffb070', 'shield' => '#8fd4ff', 'buff' => '#ffcf5a', 'line' => '#fff0a0', 'area' => '#ff9050', 'nova' => '#a0e4ff', 'heal' => '#7fff9f', 'shift' => '#ff7a5a', 'raise' => '#7fe08a'];
$keys = ['R', 'T', 'Y'];
$spriteKeyOf = fn(Hero $h) => $h->getSpriteKey();


$pageTitle = 'Heroes';
require __DIR__ . '/../includes/header.php';
$flash = $flash ?? null;
?>
<style>
    .hp { --gold:#ffcf5a; --ink:#14122a; --panel:#1d1a3a; --line:#3a3568; color:#e8e6ff; }
    .hp h1 { margin:0 0 4px; }
    .hp .sub { opacity:.75; margin:0 0 16px; }
    .hp canvas { image-rendering: pixelated; }
    /* hero picker */
    .picker { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-bottom:22px; }
    .hcard { position:relative; display:block; text-decoration:none; color:inherit; background:linear-gradient(180deg,#26224d,#171433);
             border:2px solid var(--line); border-radius:12px; padding:12px; transition:transform .12s, border-color .12s, box-shadow .12s; }
    .hcard:hover { transform:translateY(-3px); border-color:#7a72d6; }
    .hcard.view { border-color:var(--gold); box-shadow:0 0 0 2px rgba(255,207,90,.25), 0 8px 24px rgba(0,0,0,.4); }
    .hcard .stage { height:150px; border-radius:8px; display:flex; align-items:flex-end; justify-content:center; overflow:hidden;
                    background:radial-gradient(ellipse at 50% 85%, rgba(255,207,90,.22), transparent 62%), #0f0d22; }
    .hcard .stage canvas { width:144px; height:144px; filter:drop-shadow(0 6px 4px rgba(0,0,0,.6)); }
    .hcard h3 { margin:10px 0 2px; font-size:1.15rem; }
    .role { display:inline-block; font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; padding:2px 8px; border-radius:20px; background:#2e2a5e; color:#b9b4ff; }
    .ribbon { position:absolute; top:10px; right:-6px; background:var(--gold); color:#1a1424; font-weight:700; font-size:.7rem; letter-spacing:.08em;
              padding:3px 10px; border-radius:4px 0 0 4px; box-shadow:0 2px 6px rgba(0,0,0,.4); }
    .stat { display:grid; grid-template-columns:44px 1fr 64px; gap:8px; align-items:center; font-size:.8rem; margin:4px 0; }
    .sb { height:8px; background:#0f0d22; border-radius:4px; overflow:hidden; border:1px solid #2c2858; }
    .sb i { display:block; height:100%; border-radius:4px; }
    .sv { text-align:right; } .sv em { color:#7fff9f; font-style:normal; }
    .sl { opacity:.7; }
    /* detail */
    .detail { display:grid; grid-template-columns:minmax(220px,300px) 1fr; gap:18px; background:var(--panel); border:2px solid var(--line); border-radius:12px; padding:16px; margin-bottom:22px; }
    @media (max-width:760px) { .detail { grid-template-columns:1fr; } }
    .detail .stage { border-radius:10px; background:radial-gradient(ellipse at 50% 90%, rgba(255,207,90,.28), transparent 60%), #0f0d22;
                     display:flex; align-items:flex-end; justify-content:center; min-height:250px; }
    .detail .stage canvas { width:240px; height:240px; filter:drop-shadow(0 8px 6px rgba(0,0,0,.6)); }
    .abilities { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px; margin:12px 0; }
    .ab { background:#13112b; border:1px solid var(--line); border-left-width:4px; border-radius:8px; padding:8px 10px; }
    .ab .top { display:flex; align-items:center; gap:8px; }
    .key { display:inline-block; min-width:22px; text-align:center; font-weight:700; border:1px solid #6a63c0; border-radius:5px; background:#26224d; padding:1px 5px; font-size:.8rem; }
    .ab .cd { margin-left:auto; font-size:.75rem; opacity:.7; }
    .ab p { margin:4px 0 0; font-size:.82rem; opacity:.85; }
    .chips { display:flex; gap:6px; flex-wrap:wrap; margin:8px 0; }
    .chip { background:#2a255a; border:1px solid #4a43a0; border-radius:20px; padding:2px 10px; font-size:.78rem; color:#cfcaff; }
    .hp .go { display:inline-block; background:var(--gold); color:#1a1424; font-weight:700; border:0; border-radius:8px; padding:9px 18px; cursor:pointer; font-size:.95rem; }
    .hp .go:hover { filter:brightness(1.1); }
    .hp .ghost2 { background:transparent; color:#cfcaff; border:1px solid #5a53b0; border-radius:8px; padding:5px 10px; cursor:pointer; font-size:.8rem; }
    .hp .ghost2:hover { background:#2a255a; }
    /* equipment */
    .slots { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; margin-bottom:24px; }
    .slot { display:flex; gap:12px; align-items:center; background:var(--panel); border:2px dashed var(--line); border-radius:12px; padding:12px; min-height:84px; }
    .slot.full { border-style:solid; }
    .slot canvas, .icard canvas { width:56px; height:56px; border-radius:6px; flex:none; }
    .slot .nm { font-weight:700; } .slot small { opacity:.8; display:block; }
    .rar { font-size:.7rem; letter-spacing:.08em; text-transform:uppercase; }
    /* inventory */
    .filters { display:flex; gap:6px; flex-wrap:wrap; margin:6px 0 12px; }
    .filters button { background:#1d1a3a; color:#cfcaff; border:1px solid var(--line); border-radius:20px; padding:4px 14px; cursor:pointer; }
    .filters button.on { background:var(--gold); color:#1a1424; border-color:var(--gold); font-weight:700; }
    .items { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:10px; }
    .icard { display:flex; gap:10px; background:var(--panel); border:2px solid var(--line); border-radius:10px; padding:10px; }
    .icard .info { flex:1; min-width:0; font-size:.85rem; }
    .icard .nm { font-weight:700; }
    .icard .btns { display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; }
    .icard form { margin:0; }
    .empty-note { padding:18px; text-align:center; border:2px dashed var(--line); border-radius:12px; opacity:.8; }
</style>

<div class="hp">
<section class="hero">
    <h1>Heroes</h1>
    <p class="sub">Your hero joins every Endless run for free. Choose who leads your army and equip the loot you find.</p>
</section>

<?php if ($flash): ?>
    <div class="alert <?= $flash[0] === 'ok' ? 'ok' : '' ?>"><?= htmlspecialchars($flash[1]) ?></div>
<?php endif; ?>

<div class="picker">
    <?php foreach ($heroes as $h): ?>
        <a class="hcard <?= $h->getId() === $view->getId() ? 'view' : '' ?>" href="?hero=<?= $h->getId() ?>">
            <?php if ($h->getId() === $selected->getId()): ?><span class="ribbon">ACTIVE</span><?php endif; ?>
            <div class="stage"><canvas width="48" height="48" data-hero="<?= htmlspecialchars($spriteKeyOf($h)) ?>"></canvas></div>
            <h3><?= htmlspecialchars($h->getName()) ?></h3>
            <span class="role"><?= htmlspecialchars($h->getRole()) ?></span>
            <div style="margin-top:8px">
                <?= $bar('HP', $h->getHp(), $maxOf['hp'], '#4fd05f') ?>
                <?= $bar('DMG', $h->getDamage(), $maxOf['damage'], '#ff7a5a') ?>
                <?= $bar('SPD', $h->getSpeed(), $maxOf['speed'], '#5ab4ff') ?>
                <?= $bar('RNG', $h->getAttackRange(), $maxOf['range'], '#ffcf5a') ?>
            </div>
        </a>
    <?php endforeach; ?>
</div>

<div class="detail">
    <div class="stage"><canvas width="48" height="48" data-hero="<?= htmlspecialchars($spriteKeyOf($view)) ?>"></canvas></div>
    <div>
        <h2 style="margin:0"><?= htmlspecialchars($view->getName()) ?> <span class="role"><?= htmlspecialchars($view->getRole()) ?></span></h2>
        <p style="opacity:.85"><?= htmlspecialchars($view->getDescription()) ?></p>
        <?= $bar('HP', $view->getHp(), $maxOf['hp'], '#4fd05f', $totals['hp_pct'] ? '+' . $totals['hp_pct'] . '%' : '') ?>
        <?= $bar('DMG', $view->getDamage(), $maxOf['damage'], '#ff7a5a', $totals['damage_pct'] ? '+' . $totals['damage_pct'] . '%' : '') ?>
        <?= $bar('SPD', $view->getSpeed(), $maxOf['speed'], '#5ab4ff', $totals['speed_pct'] ? '+' . $totals['speed_pct'] . '%' : '') ?>
        <?= $bar('RNG', $view->getAttackRange(), $maxOf['range'], '#ffcf5a') ?>
        <div class="chips">
            <span class="chip">Revive <?= $view->getReviveSec() ?>s</span>
            <?php if ($totals['cdr_pct']): ?><span class="chip">Abilities +<?= $totals['cdr_pct'] ?>% faster</span><?php endif; ?>
            <?php if ($totals['lifesteal_pct']): ?><span class="chip">Lifesteal <?= $totals['lifesteal_pct'] ?>%</span><?php endif; ?>
        </div>
        <h3 style="margin:10px 0 0">Abilities</h3>
        <div class="abilities">
            <?php foreach ($view->abilities() as $i => $a): $c = $abilityColor[$a['ability_type']] ?? '#fff'; ?>
                <div class="ab" style="border-left-color:<?= $c ?>">
                    <div class="top"><span class="key"><?= $keys[$i] ?? '?' ?></span><strong><?= htmlspecialchars($a['name']) ?></strong><span class="cd"><?= $a['cooldown_sec'] ?>s</span></div>
                    <p><?= htmlspecialchars($a['description']) ?></p>
                </div>
            <?php endforeach; ?>
        </div>
        <?php if ($view->getId() !== $selected->getId()): ?>
            <form method="post">
                <?= Csrf::field() ?>
                <input type="hidden" name="action" value="select">
                <input type="hidden" name="hero_id" value="<?= $view->getId() ?>">
                <button class="go" type="submit">Use <?= htmlspecialchars($view->getName()) ?> in runs</button>
            </form>
        <?php else: ?>
            <span class="chip" style="border-color:#ffcf5a;color:#ffcf5a">This is your active hero</span>
        <?php endif; ?>
    </div>
</div>

<h2>Equipment</h2>
<div class="slots">
    <?php foreach (Item::SLOTS as $slot): $e = $equipped[$slot] ?? null; ?>
        <div class="slot <?= $e ? 'full' : '' ?>" style="<?= $e ? 'border-color:' . $colors[$e['rarity']] : '' ?>">
            <canvas width="16" height="16" data-slot="<?= $slot ?>" data-rarity="<?= $e ? $e['rarity'] : 'empty' ?>"></canvas>
            <div style="flex:1">
                <?php if ($e): ?>
                    <div class="rar" style="color:<?= $colors[$e['rarity']] ?>"><?= $e['rarity'] ?> <?= $slot ?></div>
                    <div class="nm"><?= htmlspecialchars($e['name']) ?></div>
                    <small><?= Item::statText($e) ?></small>
                    <form method="post" style="margin-top:6px">
                        <?= Csrf::field() ?>
                        <input type="hidden" name="action" value="unequip">
                        <input type="hidden" name="hero_id" value="<?= $view->getId() ?>">
                        <input type="hidden" name="slot" value="<?= $slot ?>">
                        <button class="ghost2" type="submit">Remove</button>
                    </form>
                <?php else: ?>
                    <div class="rar" style="opacity:.6"><?= $slot ?></div>
                    <div class="nm" style="opacity:.6">Empty slot</div>
                <?php endif; ?>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<h2>Inventory <small style="opacity:.6">(<?= count($inventory) ?>)</small></h2>
<?php if (!$inventory): ?>
    <div class="empty-note">No items yet. Play Endless and defeat monsters and bosses to find some.</div>
<?php else: ?>
    <div class="filters">
        <button type="button" class="on" data-f="all">All</button>
        <?php foreach (Item::SLOTS as $slot): ?><button type="button" data-f="<?= $slot ?>"><?= ucfirst($slot) ?>s</button><?php endforeach; ?>
    </div>
    <div class="items">
        <?php foreach ($inventory as $it): ?>
            <div class="icard" data-slot="<?= $it['slot'] ?>" style="border-color:<?= $colors[$it['rarity']] ?>">
                <canvas width="16" height="16" data-slot="<?= $it['slot'] ?>" data-rarity="<?= $it['rarity'] ?>"></canvas>
                <div class="info">
                    <div class="rar" style="color:<?= $colors[$it['rarity']] ?>"><?= $it['rarity'] ?> <?= $it['slot'] ?></div>
                    <div class="nm"><?= htmlspecialchars($it['name']) ?></div>
                    <small><?= Item::statText($it) ?></small>
                    <?php if ($it['description']): ?><small><em><?= htmlspecialchars($it['description']) ?></em></small><?php endif; ?>
                    <?php if ($it['equipped_hero_id'] !== null): ?><small style="color:#7fff9f">Equipped on hero #<?= (int) $it['equipped_hero_id'] ?></small><?php endif; ?>
                    <div class="btns">
                        <form method="post">
                            <?= Csrf::field() ?>
                            <input type="hidden" name="action" value="equip">
                            <input type="hidden" name="hero_id" value="<?= $view->getId() ?>">
                            <input type="hidden" name="player_item_id" value="<?= (int) $it['player_item_id'] ?>">
                            <button class="ghost2" type="submit" style="border-color:#ffcf5a;color:#ffcf5a">Equip on <?= htmlspecialchars($view->getName()) ?></button>
                        </form>
                        <form method="post" onsubmit="return confirm('Discard this item?');">
                            <?= Csrf::field() ?>
                            <input type="hidden" name="action" value="discard">
                            <input type="hidden" name="hero_id" value="<?= $view->getId() ?>">
                            <input type="hidden" name="player_item_id" value="<?= (int) $it['player_item_id'] ?>">
                            <button class="ghost2" type="submit">Discard</button>
                        </form>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
</div>

<script type="module">
import { getHeroSheet } from '<?= BASE_URL ?>/assets/js/game/HeroArt.js';
import { drawItemIcon } from '<?= BASE_URL ?>/assets/js/game/ItemArt.js';

const sheet = getHeroSheet();
document.querySelectorAll('canvas[data-hero]').forEach((cv) => {
    const spot = sheet.units[cv.dataset.hero];
    if (!spot) return;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(sheet.canvas, spot.right[0] * sheet.cell, 0, sheet.cell, sheet.cell, 0, 0, 48, 48);
});
document.querySelectorAll('canvas[data-slot]').forEach((cv) => {
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (cv.dataset.rarity === 'empty') {
        g.fillStyle = '#14122a'; g.fillRect(0, 0, 16, 16);
        g.fillStyle = '#3a3568'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
        return;
    }
    drawItemIcon(g, 0, 0, 16, cv.dataset.slot, cv.dataset.rarity);
});
document.querySelectorAll('.filters button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.filters button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.icard').forEach((c) => { c.style.display = (b.dataset.f === 'all' || c.dataset.slot === b.dataset.f) ? '' : 'none'; });
}));
</script>
<?php require __DIR__ . '/../includes/footer.php'; ?>