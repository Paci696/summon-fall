export class SpriteSkin {
    constructor(image, cell, spot, blob = false) {
        this.image = image;
        this.cell = cell;
        this.frames = { right: spot.right, left: spot.left };
        this.blob = blob;               // slimes squash instead of hopping
        this.anim = 'idle';
        this.t = Math.random() * 3;     // so units don't all bob in sync
        this.measure();
    }

    get ready() { return !!this.image; }

    // Finds the top and bottom opaque rows, so feet and health bar sit correctly.
    measure() {
        const s = this.cell;
        let top = s, bottom = 0;
        try {
            const c = document.createElement('canvas');
            c.width = c.height = s;
            const g = c.getContext('2d', { willReadFrequently: true });
            for (const [col, row] of [this.frames.right, this.frames.left]) {
                g.clearRect(0, 0, s, s);
                g.drawImage(this.image, col * s, row * s, s, s, 0, 0, s, s);
                const px = g.getImageData(0, 0, s, s).data;
                for (let y = 0; y < s; y++) {
                    for (let x = 0; x < s; x++) {
                        if (px[(y * s + x) * 4 + 3] > 20) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
                    }
                }
            }
        } catch (e) { top = 0; bottom = s - 1; }
        if (bottom < top) { top = 0; bottom = s - 1; }
        this.bottom = bottom;
        this.height = bottom - top + 1;
    }

    play(name) {
        if (name !== this.anim) { this.anim = name; this.t = 0; }
    }

    update(dtMs) {
        this.t += dtMs / 1000;
    }

    draw(ctx, x, y, flip = false) {
        if (!this.image) return false;
        const s = this.cell;
        const [col, row] = flip ? this.frames.left : this.frames.right;
        const dir = flip ? -1 : 1;
        let dx = 0, dy = 0, sx = 1, sy = 1;

        if (this.anim === 'walk') {
            const p = Math.sin(this.t * 16);
            if (this.blob) { sy = 1 + p * 0.12; sx = 1 - p * 0.08; }
            else { dy = -Math.round(Math.abs(p) * 2); dx = Math.round(p); }
        } else if (this.anim === 'attack') {
            const p = Math.max(0, Math.sin(this.t * 14));
            dx = Math.round(dir * p * 4);
            if (this.blob) { sy = 1 - p * 0.15; sx = 1 + p * 0.15; }
        } else {
            const p = Math.sin(this.t * 3);
            if (this.blob) { sy = 1 + p * 0.05; sx = 1 - p * 0.03; }
            else dy = p > 0.3 ? -1 : 0;
        }

        ctx.save();
        ctx.translate(Math.round(x + dx), Math.round(y + dy));
        ctx.scale(sx, sy);
        ctx.drawImage(this.image, col * s, row * s, s, s, -s / 2, -(this.bottom + 1), s, s);
        ctx.restore();
        return true;
    }
}