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
    .hp { --gold:#ffcf5a; --ink:#05040f; --panel:#1a1a30; --line:#34345a; color:#e8e8f0; max-width:1100px; margin:0 auto; }
    .hp h1 { text-align:center; font-size:clamp(1.4rem,3.4vw,2.1rem); text-transform:uppercase; margin:6px 0 4px; text-shadow:0 3px 0 #b05a12, 0 0 24px rgba(255,170,60,.35); }
    .hp h2 { font-size:.85rem; text-transform:uppercase; letter-spacing:.06em; margin:26px 0 12px; display:flex; align-items:center; gap:12px; }
    .hp h2::after { content:''; flex:1; height:3px; background:linear-gradient(90deg,#34345a,transparent); }
    .hp .sub { text-align:center; color:#9a9bc8; margin:0 0 22px; }
    .hp canvas { image-rendering:pixelated; }
    /* roster */
    .picker { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; margin-bottom:22px; }
    .hcard { position:relative; display:block; text-decoration:none; color:inherit; padding:10px; background:linear-gradient(180deg,#25254a,#14142a);
             border:2px solid var(--line); box-shadow:3px 3px 0 var(--ink); transition:transform .12s, border-color .12s; }
    .hcard:hover { transform:translateY(-4px); border-color:#8f90e0; }
    .hcard.view { border-color:var(--gold); box-shadow:3px 3px 0 var(--ink), 0 0 20px rgba(255,207,90,.3); }
    .hcard .stage { height:120px; display:flex; align-items:flex-end; justify-content:center; overflow:hidden;
        background:radial-gradient(ellipse at 50% 100%, rgba(176,112,255,.35), transparent 65%), #0b0a1c; border:2px solid #20203c; }
    .hcard .stage canvas { width:112px; height:112px; filter:drop-shadow(0 5px 3px rgba(0,0,0,.7)); transition:transform .15s; }
    .hcard:hover .stage canvas { transform:scale(1.08) translateY(-3px); }
    .hcard h3 { margin:10px 0 6px; font-size:.7rem; text-transform:uppercase; color:#fff; }
    .role { display:inline-block; font:.5rem 'Press Start 2P', monospace; letter-spacing:.06em; text-transform:uppercase; padding:4px 7px; background:#2e2a6a; color:#c9c4ff; }
    .ribbon { position:absolute; top:-2px; right:-2px; background:var(--gold); color:#1a1424; font:.5rem 'Press Start 2P', monospace; padding:5px 7px; box-shadow:0 3px 0 #b88a22; z-index:2; }
    .stat { display:grid; grid-template-columns:40px 1fr 62px; gap:8px; align-items:center; font-size:.78rem; margin:5px 0; }
    .sb { height:8px; background:#0b0a1c; border:1px solid #2c2858; }
    .sb i { display:block; height:100%; }
    .sv { text-align:right; } .sv em { color:#6fff9a; font-style:normal; }
    .sl { color:#8f90b8; font-size:.7rem; }
    /* detail */
    .detail { display:grid; grid-template-columns:minmax(220px,320px) 1fr; gap:0; background:var(--panel); border:2px solid var(--gold); box-shadow:4px 4px 0 var(--ink), 0 0 26px rgba(255,207,90,.15); margin-bottom:10px; }
    @media (max-width:760px) { .detail { grid-template-columns:1fr; } }
    .detail .stage { display:flex; align-items:flex-end; justify-content:center; min-height:300px; position:relative; overflow:hidden;
        background:radial-gradient(circle at 70% 18%, rgba(236,232,255,.9) 0 18px, rgba(200,190,255,.15) 19px 60px, transparent 61px),
                   linear-gradient(180deg,#07061a,#1d1440 70%,#2a1a45); border-right:2px solid var(--line); }
    .detail .stage::after { content:''; position:absolute; left:0; right:0; bottom:0; height:44px; background:linear-gradient(180deg,#120d26,#07050f); border-top:3px solid #2a2150; }
    .detail .stage canvas { position:relative; z-index:1; width:250px; height:250px; margin-bottom:14px; filter:drop-shadow(0 8px 6px rgba(0,0,0,.7)); animation:heroBob 2.2s ease-in-out infinite; }
    @keyframes heroBob { 50% { transform:translateY(-6px); } }
    .detail .body { padding:18px; }
    .detail h2::after { display:none; }
    .abilities { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px; margin:12px 0; }
    .ab { background:#10101f; border:2px solid var(--line); border-left-width:5px; padding:9px 10px; }
    .ab .top { display:flex; align-items:center; gap:8px; }
    .key { display:inline-grid; place-items:center; min-width:24px; height:24px; font:.6rem 'Press Start 2P', monospace; color:#1a1424; background:var(--gold); box-shadow:0 3px 0 #b88a22; }
    .ab .cd { margin-left:auto; font-size:.75rem; color:#8f90b8; }
    .ab p { margin:6px 0 0; font-size:.82rem; color:#b8b9de; }
    .chips { display:flex; gap:6px; flex-wrap:wrap; margin:10px 0; }
    .chip { background:#22224a; border:2px solid #3a3a7a; padding:3px 9px; font-size:.76rem; color:#cfcaff; }
    .hp .go { display:inline-block; background:var(--gold); color:#1a1424; font:.65rem 'Press Start 2P', monospace; border:0; padding:12px 18px; cursor:pointer; box-shadow:0 4px 0 #b88a22; }
    .hp .go:hover { filter:brightness(1.1); transform:translateY(-1px); }
    .hp .ghost2 { background:transparent; color:#cfd0ff; border:2px solid #4a4a80; padding:5px 10px; cursor:pointer; font-size:.78rem; }
    .hp .ghost2:hover { background:#2a2a5a; }
    /* equipment */
    .slots { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
    .slot { display:flex; gap:12px; align-items:center; background:var(--panel); border:2px dashed var(--line); padding:12px; min-height:88px; }
    .slot.full { border-style:solid; box-shadow:3px 3px 0 var(--ink); }
    .slot canvas, .icard canvas { width:56px; height:56px; flex:none; background:#0b0a1c; border:2px solid #20203c; }
    .slot .nm { font-weight:bold; } .slot small { color:#a0a1c8; display:block; }
    .rar { font:.5rem 'Press Start 2P', monospace; text-transform:uppercase; margin-bottom:4px; }
    /* inventory */
    .filters { display:flex; gap:8px; flex-wrap:wrap; margin:0 0 12px; }
    .filters button { background:#1c1c32; color:#cfd0ff; border:2px solid var(--line); padding:8px 12px; cursor:pointer; font:.55rem 'Press Start 2P', monospace; box-shadow:2px 2px 0 var(--ink); }
    .filters button.on { background:var(--gold); color:#1a1424; border-color:var(--gold); }
    .items { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:10px; }
    .icard { display:flex; gap:10px; background:var(--panel); border:2px solid var(--line); padding:10px; box-shadow:3px 3px 0 var(--ink); }
    .icard .info { flex:1; min-width:0; font-size:.85rem; }
    .icard .info small { display:block; color:#a0a1c8; }
    .icard .nm { font-weight:bold; }
    .icard .btns { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }
    .icard form { margin:0; }
    .empty-note { padding:18px; text-align:center; border:2px dashed var(--line); color:#9a9bc8; }
</style>

<div class="hp">
<section>
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
    <div class="body">
        <h2 style="margin:0;display:block"><?= htmlspecialchars($view->getName()) ?> <span class="role"><?= htmlspecialchars($view->getRole()) ?></span></h2>
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