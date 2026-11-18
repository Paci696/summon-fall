<?php
require_once __DIR__ . '/../includes/auth_check.php';

$mode = in_array($_GET['mode'] ?? '', ['endless', 'tutorial'], true) ? $_GET['mode'] : 'endless';
$mapId = (int) ($_GET['map'] ?? 1);
if (!in_array($mapId, [1, 2, 3], true)) {
    $mapId = 1;
}
$config = ['baseUrl' => BASE_URL, 'mode' => $mode, 'username' => $currentUser->getUsername(),'mapId' => $mapId, 'debug' => DEBUG, 'csrf' => Csrf::token()];
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
    <a class="back" href="<?= BASE_URL ?>/views/menu.php">&larr; Menu</a>
    <div id="error" hidden></div>
    <script>window.GAME_CONFIG = <?= json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
    <script type="module" src="<?= BASE_URL ?>/assets/js/game/main.js"></script>
</body>
</html>