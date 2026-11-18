<?php
require_once __DIR__ . '/../../includes/auth_check.php';
$keys = array_map(fn($u) => $u->getSpriteKey(), Unit::all());
$pageTitle = 'Sprite Viewer';
require __DIR__ . '/../../includes/header.php';
?>
<h1>Sprite Viewer</h1>
<p>Each unit shows its <strong>right</strong> frame, then its <strong>left</strong> frame. If a unit faces the wrong way, swap its two cells in <code>units.json</code>.</p>
<div id="list" style="display:flex; flex-wrap:wrap; gap:12px"></div>
<script>
(async () => {
    const base = <?= json_encode(BASE_URL) ?> + '/assets/sprites/units/';
    const keys = <?= json_encode($keys) ?>;
    const list = document.getElementById('list');
    let atlas = null;
    const img = new Image();
    try {
        img.src = base + 'units.png';
        atlas = await (await fetch(base + 'units.json')).json();
        await img.decode();
    } catch (e) { atlas = null; }

    for (const key of keys) {
        const box = document.createElement('div');
        box.className = 'panel';
        box.innerHTML = '<h2>' + key + '</h2>';
        const spot = atlas && atlas.units && atlas.units[key];
        if (!spot) {
            box.innerHTML += '<small>No sprite yet (the game uses a shape).</small>';
        } else {
            for (const side of ['right', 'left']) {
                const c = document.createElement('canvas');
                c.width = c.height = atlas.cell * 4;
                c.style.cssText = 'background:#2e5a2e; image-rendering:pixelated; margin-right:6px';
                const g = c.getContext('2d');
                g.imageSmoothingEnabled = false;
                const [col, row] = spot[side];
                g.drawImage(img, col * atlas.cell, row * atlas.cell, atlas.cell, atlas.cell, 0, 0, c.width, c.height);
                box.appendChild(c);
            }
        }
        list.appendChild(box);
    }
})();
</script>
<?php require __DIR__ . '/../../includes/footer.php'; ?>