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
    <link rel="icon" href="data:,">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Play - <?= APP_NAME ?></title>
    <link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/game.css">
</head>
<body class="game-page">
    <div id="stage">
        <canvas id="game" width="960" height="540"></canvas>
    </div>
    <button type="button" id="menuBtn">&#9776; MENU</button>
    <style>
        /* MENU pill: sits under the resource panel and scales with the canvas */
        #menuBtn { position: fixed; z-index: 20; padding: 5px 10px; font: bold 11px monospace; letter-spacing: .08em; color: #ffcf5a; cursor: pointer;
            background: rgba(10, 8, 24, .78); border: 2px solid #ffcf5a; box-shadow: 2px 2px 0 #05040f; transition: background .12s; }
        #menuBtn:hover { background: #ffcf5a; color: #1a1424; }
        /* pause menu */
        #pause { position: fixed; inset: 0; z-index: 50; display: none; align-items: center; justify-content: center; background: rgba(4, 3, 14, .72); backdrop-filter: blur(2px); font-family: monospace; }
        #pause.open { display: flex; }
        #pause .box { width: min(360px, 92vw); padding: 22px 22px 18px; background: linear-gradient(180deg, #25254a, #10102a); border: 2px solid #ffcf5a; box-shadow: 4px 4px 0 #05040f, 0 0 40px rgba(255, 207, 90, .18); text-align: center; animation: pz .14s ease-out; }
        @keyframes pz { from { transform: scale(.92); opacity: 0; } }
        #pause h2 { margin: 0 0 4px; color: #fff; font-size: 20px; letter-spacing: .18em; text-shadow: 0 3px 0 #b05a12; }
        #pause .info { color: #9a9bc8; font-size: 11px; margin: 0 0 16px; letter-spacing: .06em; }
        #pause button { display: block; width: 100%; margin: 9px 0 0; padding: 12px 10px; font: bold 13px monospace; letter-spacing: .12em; cursor: pointer; color: #e8e8f0; background: #1c1c3a; border: 2px solid #4a4a80; box-shadow: 0 3px 0 #05040f; text-align: left; position: relative; }
        #pause button:hover, #pause button:focus-visible { outline: 0; border-color: #ffcf5a; background: #2a2a58; transform: translateY(-1px); }
        #pause button small { display: block; margin-top: 3px; font: 10px monospace; letter-spacing: .02em; color: #9a9bc8; }
        #pause button.primary { background: #ffcf5a; color: #1a1424; border-color: #ffcf5a; box-shadow: 0 3px 0 #b88a22; }
        #pause button.primary small { color: #5a4210; }
        #pause button.danger:hover { border-color: #ff7a6a; background: #3a1c2c; }
        #pause button .k { position: absolute; right: 10px; top: 12px; font-size: 10px; opacity: .7; border: 1px solid currentColor; padding: 1px 5px; }
        #pause .confirm { display: none; margin-top: 12px; padding: 12px; border: 2px dashed #ff7a6a; color: #ffb0a4; font-size: 12px; }
        #pause .confirm.on { display: block; }
        #pause .confirm .row { display: flex; gap: 8px; margin-top: 10px; }
        #pause .confirm button { margin: 0; text-align: center; padding: 9px 6px; font-size: 11px; }
    </style>
    <div id="pause" role="dialog" aria-modal="true" aria-label="Paused">
        <div class="box">
            <h2>PAUSED</h2>
            <p class="info" id="pauseInfo"></p>
            <button type="button" class="primary" id="pzResume">RESUME<span class="k">ESC</span><small>Back to the battle</small></button>
            <button type="button" id="pzSave">SAVE &amp; QUIT<small>End the run, keep your score, XP and drops</small></button>
            <button type="button" class="danger" id="pzQuit">QUIT WITHOUT SAVING<small>Leave now, nothing from this run is kept</small></button>
            <div class="confirm" id="pzConfirm">Really leave? This run's score, XP and items will be lost.
                <div class="row"><button type="button" id="pzNo">KEEP PLAYING</button><button type="button" class="danger" id="pzYes">LEAVE</button></div>
            </div>
        </div>
    </div>
    <script>
        (function () {
            const cv = document.getElementById('game'), b = document.getElementById('menuBtn'), P = document.getElementById('pause');
            const $ = (id) => document.getElementById(id);
            const tutorial = <?= json_encode($mode === 'tutorial') ?>;
            const menuUrl = <?= json_encode(BASE_URL . '/views/menu.php') ?>;
            function place() {
                const r = cv.getBoundingClientRect(), k = r.width / 960;
                b.style.left = Math.round(r.left + 4 * k) + 'px';
                b.style.top = Math.round(r.top + 76 * k) + 'px';
                b.style.transform = 'scale(' + Math.max(0.8, Math.min(1.4, k * 0.75)) + ')';
                b.style.transformOrigin = 'top left';
            }
            addEventListener('resize', place); addEventListener('load', place); place(); setInterval(place, 1000);

            // Game hooks: window.__game when Game.js exposes it, otherwise the same keys the game already listens to (Space = pause, F = retire)
            const tap = (code) => { const o = { code, key: code === 'Space' ? ' ' : 'f', bubbles: true };
                dispatchEvent(new KeyboardEvent('keydown', o)); setTimeout(() => dispatchEvent(new KeyboardEvent('keyup', o)), 90); };
            const game = () => window.__game || null;
            let wasPaused = false;
            function open() {
                if (P.classList.contains('open')) return;
                const g = game();
                wasPaused = g ? !!g.paused : false;
                if (g) g.paused = true; else tap('Space');
                $('pauseInfo').textContent = g && g.spawner ? 'WAVE ' + g.spawner.wave + '  \u00b7  ' + g.kills + ' KILLS  \u00b7  ' + g.score + ' SCORE' : (tutorial ? 'TUTORIAL' : '');
                $('pzSave').style.display = tutorial ? 'none' : '';
                $('pzQuit').firstChild.nodeValue = tutorial ? 'LEAVE TUTORIAL' : 'QUIT WITHOUT SAVING';
                $('pzConfirm').classList.remove('on');
                P.classList.add('open'); $('pzResume').focus();
            }
            function close() {
                if (!P.classList.contains('open')) return;
                P.classList.remove('open');
                const g = game();
                if (g) g.paused = wasPaused; else tap('Space');
            }
            b.addEventListener('click', open);
            $('pzResume').addEventListener('click', close);
            $('pzSave').addEventListener('click', () => {
                P.classList.remove('open');
                const g = game();
                if (g && typeof g.endRun === 'function') { g.paused = false; g.endRun('retired'); }
                else { tap('KeyF'); }                                    // game is paused by us, so F retires the run
            });
            $('pzQuit').addEventListener('click', () => { if (tutorial) location.href = menuUrl; else $('pzConfirm').classList.add('on'); });
            $('pzNo').addEventListener('click', () => $('pzConfirm').classList.remove('on'));
            $('pzYes').addEventListener('click', () => { location.href = menuUrl; });
            addEventListener('keydown', (e) => {
                if (e.code !== 'Escape' || e.repeat) return;
                e.preventDefault(); P.classList.contains('open') ? close() : open();
            }, true);
            // tab hidden = pause automatically
            document.addEventListener('visibilitychange', () => { if (document.hidden && !P.classList.contains('open')) open(); });
        })();
    </script>
    <div id="error" hidden></div>
    <script>window.GAME_CONFIG = <?= json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
    <script type="module" src="<?= BASE_URL ?>/assets/js/game/main.js"></script>
</body>
</html>