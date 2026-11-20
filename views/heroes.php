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
$lvl = HeroLevel::info($uid, $view->getId());
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
    .lvl { display:flex; align-items:center; gap:12px; margin:10px 0 14px; }
    .lvl .badge { font:.7rem 'Press Start 2P', monospace; color:#1a1424; background:var(--gold); padding:8px 10px; box-shadow:0 3px 0 #b88a22; white-space:nowrap; }
    .lvl .xp { flex:1; }
    .lvl .xpbar { height:10px; background:#0b0a1c; border:1px solid #2c2858; }
    .lvl .xpbar i { display:block; height:100%; background:linear-gradient(90deg,#b070ff,#ffcf5a); }
    .lvl small { display:block; color:#9a9bc8; margin-top:4px; font-size:.72rem; }
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
    /* loadout */
    .totals { display:flex; gap:8px; flex-wrap:wrap; margin:0 0 12px; }
    .tot { flex:1 1 90px; background:#10101f; border:2px solid var(--line); padding:7px 9px; }
    .tot small { display:block; font:.45rem 'Press Start 2P', monospace; color:#8f90b8; letter-spacing:.05em; }
    .tot b { font-size:1.05rem; color:#6fff9a; } .tot.zero b { color:#4a4a70; }
    .sockets { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; margin-bottom:6px; }
    .socket { position:relative; background:linear-gradient(180deg,#22224a,#12122a); border:2px solid var(--line); box-shadow:3px 3px 0 var(--ink); padding:10px; cursor:pointer; transition:transform .12s; }
    .socket:hover { transform:translateY(-3px); }
    .socket.sel { outline:2px solid #fff; outline-offset:2px; }
    .socket .row { display:flex; gap:12px; align-items:center; }
    .socket.empty { border-style:dashed; background:#0e0e22; }
    .socket .tag { font:.5rem 'Press Start 2P', monospace; text-transform:uppercase; letter-spacing:.05em; margin-bottom:5px; }
    .socket .nm { font-weight:bold; font-size:.9rem; } .socket small { display:block; color:#a0a1c8; margin-top:2px; }
    .socket form { position:absolute; top:6px; right:6px; margin:0; }
    .socket .x { background:#0b0a1c; color:#ff9a8a; border:2px solid #4a2a3a; width:24px; height:24px; cursor:pointer; font:bold 12px monospace; line-height:1; }
    .socket .x:hover { background:#3a1c2c; }
    .ico { flex:none; display:block; image-rendering:pixelated; }
    .invwrap { display:grid; grid-template-columns:1fr 310px; gap:14px; align-items:start; }
    @media (max-width:900px) { .invwrap { grid-template-columns:1fr; } .inspect { position:static !important; order:-1; } }
    .toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:0 0 10px; }
    .toolbar .grp { display:flex; gap:0; }
    .toolbar button, .toolbar select, .toolbar input { background:#1c1c32; color:#cfd0ff; border:2px solid var(--line); padding:7px 10px; cursor:pointer; font:.5rem 'Press Start 2P', monospace; }
    .toolbar .grp button { margin-left:-2px; box-shadow:none; } .toolbar .grp button:first-child { margin-left:0; }
    .toolbar button.on { background:var(--gold); color:#1a1424; border-color:var(--gold); position:relative; z-index:1; }
    .toolbar input { cursor:text; font:.8rem monospace; width:140px; } .toolbar select { font:.75rem monospace; }
    .rdots { display:flex; gap:5px; margin-left:auto; }
    .rdot { width:20px; height:20px; border:2px solid; cursor:pointer; opacity:.35; background:transparent; padding:0; }
    .rdot.on { opacity:1; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); gap:10px; }
    .tile { position:relative; background:#10101f; border:2px solid var(--line); padding:6px 6px 8px; cursor:pointer; text-align:center; transition:transform .1s; box-shadow:2px 2px 0 var(--ink); }
    .tile:hover { transform:translateY(-3px); }
    .tile.sel { outline:2px solid #fff; outline-offset:2px; }
    .tile canvas { width:72px; height:72px; margin:0 auto; }
    .tile .t { font-size:.68rem; margin-top:5px; line-height:1.15; height:2.3em; overflow:hidden; color:#e0e0f4; }
    .tile .b { position:absolute; top:3px; left:3px; font:.4rem 'Press Start 2P', monospace; padding:3px 4px; background:#6fff9a; color:#0b2a14; z-index:2; }
    .tile .b.o { background:#4a4a80; color:#d8d8ff; }
    .tile .up { position:absolute; top:3px; right:4px; color:#6fff9a; font-size:.8rem; font-weight:bold; z-index:2; text-shadow:0 1px 0 #000; }
    .inspect { position:sticky; top:12px; background:linear-gradient(180deg,#25254a,#12122a); border:2px solid var(--line); box-shadow:4px 4px 0 var(--ink); padding:14px; min-height:200px; }
    .inspect .head { display:flex; gap:12px; align-items:center; margin-bottom:10px; }
    .inspect .nm { font-weight:bold; font-size:1rem; } .inspect .desc { color:#b8b9de; font-size:.82rem; font-style:italic; margin:8px 0; }
    .inspect .st { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #2a2a50; font-size:.85rem; }
    .inspect .st .d { font-size:.72rem; margin-left:6px; } .up2 { color:#6fff9a; } .dn { color:#ff8a7a; }
    .inspect .acts { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
    .inspect .go { flex:1; padding:11px 8px; font-size:.55rem; }
    .inspect .hint { color:#8f90b8; text-align:center; padding:28px 8px; font-size:.85rem; }
    .inspect .eqnote { color:#7fff9f; font-size:.78rem; margin-top:8px; }
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
        <div class="lvl">
            <span class="badge">LV <?= $lvl['level'] ?></span>
            <div class="xp">
                <div class="xpbar"><i style="width:<?= $lvl['need'] > 0 ? (int) round($lvl['xp'] / $lvl['need'] * 100) : 100 ?>%"></i></div>
                <small><?= $lvl['need'] > 0 ? $lvl['xp'] . ' / ' . $lvl['need'] . ' XP to next level' : 'MAX LEVEL' ?> &middot; +<?= $lvl['bonus'] ?>% HP and damage</small>
            </div>
        </div>
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

<h2>Loadout <small style="opacity:.6;text-transform:none">&middot; <?= htmlspecialchars($view->getName()) ?></small></h2>
<?php $statLabels = ['hp_pct' => 'HP', 'damage_pct' => 'Damage', 'speed_pct' => 'Speed', 'cdr_pct' => 'Ability haste', 'lifesteal_pct' => 'Lifesteal']; ?>
<div class="totals">
    <?php foreach ($statLabels as $k => $lab): $v = (int) ($totals[$k] ?? 0); ?>
        <div class="tot <?= $v ? '' : 'zero' ?>"><small><?= strtoupper($lab) ?></small><b>+<?= $v ?>%</b></div>
    <?php endforeach; ?>
</div>
<div class="sockets">
    <?php foreach (Item::SLOTS as $slot): $e = $equipped[$slot] ?? null; ?>
        <div class="socket <?= $e ? '' : 'empty' ?>" data-slot="<?= $slot ?>" <?= $e ? 'data-pid="' . (int) $e['player_item_id'] . '"' : '' ?> style="<?= $e ? 'border-color:' . $colors[$e['rarity']] : '' ?>" tabindex="0">
            <div class="row">
                <canvas class="ico" width="72" height="72" data-slot="<?= $slot ?>" data-rarity="<?= $e ? $e['rarity'] : 'empty' ?>" data-name="<?= $e ? htmlspecialchars($e['name']) : '' ?>" data-size="72"></canvas>
                <div>
                    <div class="tag" style="color:<?= $e ? $colors[$e['rarity']] : '#6a6a9a' ?>"><?= $e ? $e['rarity'] . ' ' : '' ?><?= $slot ?></div>
                    <?php if ($e): ?>
                        <div class="nm"><?= htmlspecialchars($e['name']) ?></div>
                        <small><?= Item::statText($e) ?></small>
                    <?php else: ?>
                        <div class="nm" style="opacity:.55">Empty</div><small>Pick an item below</small>
                    <?php endif; ?>
                </div>
            </div>
            <?php if ($e): ?>
                <form method="post" title="Remove">
                    <?= Csrf::field() ?>
                    <input type="hidden" name="action" value="unequip">
                    <input type="hidden" name="hero_id" value="<?= $view->getId() ?>">
                    <input type="hidden" name="slot" value="<?= $slot ?>">
                    <button class="x" type="submit" aria-label="Remove <?= $slot ?>">&times;</button>
                </form>
            <?php endif; ?>
        </div>
    <?php endforeach; ?>
</div>

<h2>Inventory <small style="opacity:.6">(<?= count($inventory) ?>)</small></h2>
<?php if (!$inventory): ?>
    <div class="empty-note">No items yet. Play Endless and defeat monsters and bosses to find some. Mythical items only drop from wave 15 on.</div>
<?php else: ?>
    <div class="invwrap">
        <div>
            <div class="toolbar">
                <div class="grp" id="slotTabs">
                    <button type="button" class="on" data-f="all">All</button>
                    <?php foreach (Item::SLOTS as $slot): ?><button type="button" data-f="<?= $slot ?>"><?= ucfirst($slot) ?></button><?php endforeach; ?>
                </div>
                <select id="sortSel" aria-label="Sort">
                    <option value="rarity">Best rarity</option><option value="name">Name</option><option value="stat">Strongest bonus</option>
                </select>
                <input id="q" type="search" placeholder="Search..." aria-label="Search items">
                <div class="rdots" id="rdots">
                    <?php foreach (Item::RARITIES as $r): ?><button type="button" class="rdot on" data-r="<?= $r ?>" title="<?= ucfirst($r) ?>" style="border-color:<?= $colors[$r] ?>;background:<?= $colors[$r] ?>55"></button><?php endforeach; ?>
                </div>
            </div>
            <div class="grid" id="grid"></div>
            <div class="empty-note" id="noMatch" style="display:none">No items match these filters.</div>
        </div>
        <aside class="inspect" id="inspect"><div class="hint">Click an item to see its stats and compare it with what <?= htmlspecialchars($view->getName()) ?> is wearing.</div></aside>
    </div>
    <form method="post" id="actForm" style="display:none">
        <?= Csrf::field() ?>
        <input type="hidden" name="action" id="fa"><input type="hidden" name="hero_id" value="<?= $view->getId() ?>">
        <input type="hidden" name="player_item_id" id="fp"><input type="hidden" name="slot" id="fs">
    </form>
<?php endif; ?>
</div>

<?php
$heroNames = [];
foreach ($heroes as $h) { $heroNames[$h->getId()] = $h->getName(); }
$stats = ['hp_pct' => 'HP', 'damage_pct' => 'Damage', 'speed_pct' => 'Speed', 'cdr_pct' => 'Ability haste', 'lifesteal_pct' => 'Lifesteal'];
$eqJson = [];
foreach ($equipped as $sl => $e) { $eqJson[$sl] = $e; }
?>
<script>
window.LOADOUT = <?= json_encode(['items' => $inventory, 'equipped' => $eqJson, 'heroes' => $heroNames, 'hero' => $view->getId(), 'heroName' => $view->getName(),
    'colors' => $colors, 'stats' => $stats, 'order' => Item::RARITIES], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
</script>
<script type="module">
import { getHeroSheet } from '<?= BASE_URL ?>/assets/js/game/HeroArt.js';
import { drawItemIcon } from '<?= BASE_URL ?>/assets/js/game/ItemArt.js';

import { getHeroFrames, HeroAnimator } from '<?= BASE_URL ?>/assets/js/game/HeroAnim.js';
const sheet = getHeroSheet();
const anims = [];
document.querySelectorAll('canvas[data-hero]').forEach((cv) => {
    const fr = getHeroFrames(cv.dataset.hero);
    if (fr) { anims.push({ cv, an: new HeroAnimator(fr) }); return; }          // animated (redrawn art)
    const spot = sheet.units[cv.dataset.hero];
    if (!spot) return;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(sheet.canvas, spot.right[0] * sheet.cell, 0, sheet.cell, sheet.cell, 0, 0, 48, 48);
});
let last = 0, n = 0;
(function tick(ms) {
    requestAnimationFrame(tick);
    const dt = Math.min(100, ms - last); last = ms; n++;
    for (const a of anims) {
        const g = a.cv.getContext('2d');
        g.clearRect(0, 0, 48, 48); g.imageSmoothingEnabled = false;
        a.an.update(dt);
        a.an.play(Math.floor(ms / 3000) % 3 === 0 && (ms % 3000) < 700 ? 'attack' : 'idle');
        a.an.draw(g, 24, 46, false, 1);
    }
})(0);
// ---- loadout: icons, inventory grid, inspector ----
const L = window.LOADOUT || { items: [], equipped: {}, colors: {}, stats: {}, order: [] };
const iconCanvases = [];
function paintIcon(cv) {
    const size = +cv.dataset.size || 72, g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (cv.dataset.rarity === 'empty') {
        g.fillStyle = '#0e0e22'; g.fillRect(0, 0, size, size); g.strokeStyle = '#3a3568'; g.setLineDash([4, 4]); g.lineWidth = 2; g.strokeRect(2, 2, size - 4, size - 4);
        g.setLineDash([]); g.fillStyle = '#3a3568'; g.font = 'bold ' + size / 2 + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+', size / 2, size / 2 + 2);
        return;
    }
    drawItemIcon(g, 0, 0, size, cv.dataset.slot, cv.dataset.rarity, cv.dataset.name, performance.now());
}
function mkIcon(slot, rarity, name, size) {
    const cv = document.createElement('canvas'); cv.className = 'ico'; cv.width = cv.height = size;
    cv.dataset.slot = slot; cv.dataset.rarity = rarity; cv.dataset.name = name; cv.dataset.size = size; paintIcon(cv); iconCanvases.push(cv); return cv;
}
document.querySelectorAll('canvas.ico').forEach((cv) => { paintIcon(cv); iconCanvases.push(cv); });
(function shimmer() {                                   // epic+ icons twinkle; mythical frames cycle colour
    requestAnimationFrame(shimmer);
    for (const cv of iconCanvases) {
        if (!cv.isConnected || !['epic', 'legendary', 'mythical'].includes(cv.dataset.rarity)) continue;
        paintIcon(cv);
    }
})();

const grid = document.getElementById('grid');
if (grid) {
    const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
    const RK = (r) => L.order.indexOf(r);
    const keys = Object.keys(L.stats);
    const power = (it) => keys.reduce((a, k) => a + (+it[k] || 0), 0);
    const st = { slot: 'all', sort: 'rarity', q: '', rar: new Set(L.order), sel: null };
    const eqOf = (slot) => L.equipped[slot] || null;
    const diffs = (it) => { const e = eqOf(it.slot); return keys.map((k) => ({ k, v: +it[k] || 0, d: (+it[k] || 0) - (e ? (+e[k] || 0) : 0) })); };
    const isUpgrade = (it) => { const e = eqOf(it.slot); return it.equipped_hero_id == null && (!e || power(it) > power(e)); };

    function render() {
        let list = L.items.filter((it) => (st.slot === 'all' || it.slot === st.slot) && st.rar.has(it.rarity) && it.name.toLowerCase().includes(st.q));
        list.sort((a, b) => st.sort === 'name' ? a.name.localeCompare(b.name) : st.sort === 'stat' ? power(b) - power(a) : (RK(b.rarity) - RK(a.rarity)) || power(b) - power(a));
        grid.textContent = '';
        list.forEach((it) => {
            const t = el('div', 'tile' + (st.sel === it.player_item_id ? ' sel' : ''));
            t.style.borderColor = L.colors[it.rarity];
            t.appendChild(mkIcon(it.slot, it.rarity, it.name, 72));
            t.appendChild(el('div', 't', it.name));
            if (it.equipped_hero_id != null) t.appendChild(el('span', 'b' + (+it.equipped_hero_id === L.hero ? '' : ' o'), +it.equipped_hero_id === L.hero ? 'WORN' : (L.heroes[it.equipped_hero_id] || 'USED').slice(0, 6).toUpperCase()));
            else if (isUpgrade(it)) t.appendChild(el('span', 'up', '\u25B2'));
            t.addEventListener('click', () => { st.sel = it.player_item_id; render(); inspect(it); });
            grid.appendChild(t);
        });
        document.getElementById('noMatch').style.display = list.length ? 'none' : '';
        document.querySelectorAll('.socket').forEach((s) => s.classList.toggle('sel', st.slot === s.dataset.slot));
    }
    function inspect(it) {
        const box = document.getElementById('inspect'); box.textContent = '';
        const head = el('div', 'head'); head.appendChild(mkIcon(it.slot, it.rarity, it.name, 80));
        const meta = el('div'); const tag = el('div', 'tag', it.rarity + ' ' + it.slot); tag.style.cssText = 'font:.5rem "Press Start 2P",monospace;text-transform:uppercase;margin-bottom:5px;color:' + L.colors[it.rarity];
        meta.appendChild(tag); meta.appendChild(el('div', 'nm', it.name)); head.appendChild(meta); box.appendChild(head);
        box.style.borderColor = L.colors[it.rarity];
        if (it.description) box.appendChild(el('div', 'desc', it.description));
        const worn = eqOf(it.slot), mine = +it.equipped_hero_id === L.hero;
        if (!mine && worn) box.appendChild(el('div', 'hint2', '')).style.cssText = 'display:none';
        diffs(it).filter((r) => r.v || (worn && +worn[r.k])).forEach((r) => {
            const row = el('div', 'st'); row.appendChild(el('span', '', L.stats[r.k]));
            const v = el('span', '', (r.v ? '+' + r.v + '%' : '0%'));
            if (!mine && worn && r.d) { const d = el('span', 'd ' + (r.d > 0 ? 'up2' : 'dn'), (r.d > 0 ? '\u25B2 +' : '\u25BC ') + r.d); v.appendChild(d); }
            row.appendChild(v); box.appendChild(row);
        });
        if (!mine && worn) box.appendChild(el('div', 'eqnote', 'Compared with ' + worn.name)).style.color = '#9a9bc8';
        if (it.equipped_hero_id != null && !mine) box.appendChild(el('div', 'eqnote', 'Worn by ' + (L.heroes[it.equipped_hero_id] || 'another hero') + ' (equipping moves it)'));
        const acts = el('div', 'acts');
        const submit = (a) => { document.getElementById('fa').value = a; document.getElementById('fp').value = it.player_item_id; document.getElementById('fs').value = it.slot; document.getElementById('actForm').submit(); };
        const b1 = el('button', 'go', mine ? 'REMOVE' : 'EQUIP ON ' + L.heroName.toUpperCase()); b1.type = 'button';
        if (mine) { b1.style.background = '#3a3a6a'; b1.style.color = '#fff'; b1.style.boxShadow = '0 4px 0 #1a1a3a'; }
        b1.addEventListener('click', () => submit(mine ? 'unequip' : 'equip')); acts.appendChild(b1);
        if (!mine) { const b2 = el('button', 'ghost2', 'Discard'); b2.type = 'button'; b2.addEventListener('click', () => { if (confirm('Discard ' + it.name + '? This cannot be undone.')) submit('discard'); }); acts.appendChild(b2); }
        box.appendChild(acts);
    }
    document.querySelectorAll('#slotTabs button').forEach((b) => b.addEventListener('click', () => {
        st.slot = b.dataset.f; document.querySelectorAll('#slotTabs button').forEach((x) => x.classList.toggle('on', x === b)); render();
    }));
    document.querySelectorAll('.rdot').forEach((b) => b.addEventListener('click', () => {
        const r = b.dataset.r; if (st.rar.has(r)) st.rar.delete(r); else st.rar.add(r); b.classList.toggle('on', st.rar.has(r)); render();
    }));
    document.getElementById('sortSel').addEventListener('change', (e) => { st.sort = e.target.value; render(); });
    document.getElementById('q').addEventListener('input', (e) => { st.q = e.target.value.trim().toLowerCase(); render(); });
    document.querySelectorAll('.socket').forEach((s) => s.addEventListener('click', (e) => {
        if (e.target.closest('form')) return;
        st.slot = s.dataset.slot; document.querySelectorAll('#slotTabs button').forEach((x) => x.classList.toggle('on', x.dataset.f === st.slot));
        const it = L.items.find((i) => String(i.player_item_id) === s.dataset.pid);
        if (it) st.sel = it.player_item_id;
        render(); if (it) inspect(it); else document.getElementById('grid').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    render();
}
</script>
<?php require __DIR__ . '/../includes/footer.php'; ?>