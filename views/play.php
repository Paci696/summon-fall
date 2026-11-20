<?php
require_once __DIR__ . '/../includes/auth_check.php';

$mode = in_array($_GET['mode'] ?? '', ['endless', 'tutorial'], true) ? $_GET['mode'] : 'endless';
$mapId = (int) ($_GET['map'] ?? 1);
if (!in_array($mapId, [1, 2, 3, 4], true)) {
    $mapId = 1;
}
$heroLevel = 1; $heroXp = 0; $heroName = '';
try {
    $hh = Hero::selectedFor($currentUser->getId());
    $heroXp = HeroLevel::totalXp($currentUser->getId(), $hh->getId());
    $heroLevel = HeroLevel::fromXp($heroXp)['level'];
    $heroName = $hh->getName();
} catch (Throwable $e) { /* level 1 */ }
$config = ['heroLevel' => $heroLevel, 'heroXp' => $heroXp, 'heroName' => $heroName, 'baseUrl' => BASE_URL, 'mode' => $mode, 'username' => $currentUser->getUsername(),'mapId' => $mapId, 'debug' => DEBUG, 'csrf' => Csrf::token()];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Play - <?= APP_NAME ?></title>
    <link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/game.css">
</head>
<body class="game-page">
    <div id="stage">
        <canvas id="game" width="960" height="540"></canvas>
    </div>
    <a class="back" id="menuBtn" href="<?= BASE_URL ?>/views/menu.php" onclick="return confirm('Leave this run? It will not be saved.');">&#9776; MENU</a>
    <style>
        /* menu button: a small pill under the resource panel, so it never overlaps the level bar or the HUD */
        #menuBtn { position: fixed !important; right: auto !important; bottom: auto !important; z-index: 20; display: inline-block;
            padding: 5px 10px; font: bold 11px monospace; letter-spacing: .08em; color: #ffcf5a !important; text-decoration: none;
            background: rgba(10, 8, 24, .78); border: 2px solid #ffcf5a; box-shadow: 2px 2px 0 #05040f; transition: background .12s; }
        #menuBtn:hover { background: #ffcf5a; color: #1a1424 !important; }
    </style>
    <script>
        (function () {   // sits under the top-left resource panel, scaled with the game canvas
            const cv = document.getElementById('game'), b = document.getElementById('menuBtn');
            function place() {
                const r = cv.getBoundingClientRect(), k = r.width / 960;
                b.style.left = Math.round(r.left + 4 * k) + 'px';
                b.style.top = Math.round(r.top + 76 * k) + 'px';
                b.style.transform = 'scale(' + Math.max(0.8, Math.min(1.4, k * 0.75)) + ')';
                b.style.transformOrigin = 'top left';
            }
            addEventListener('resize', place); addEventListener('load', place); place(); setInterval(place, 1000);
        })();
    </script>
    <div id="error" hidden></div>
    <script>window.GAME_CONFIG = <?= json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
    <script type="module" src="<?= BASE_URL ?>/assets/js/game/main.js"></script>
</body>
</html>