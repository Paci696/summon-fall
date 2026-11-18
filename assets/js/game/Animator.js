export class Animator {
    constructor(image, data) {
        this.image = image;
        this.frames = data?.frames ?? [];
        this.tags = {};
        for (const t of data?.meta?.frameTags ?? []) {
            this.tags[t.name] = { from: t.from, to: t.to };
        }
        this.current = null;
        this.tag = null;
        this.index = 0;
        this.timer = 0;
        this.loop = true;
        this.finished = false;
        this.onFrame = null; // (tagName, frameInTag) => void
    }

    get ready() {
        return !!this.image && this.frames.length > 0;
    }

    play(name, loop = true, restart = false) {
        if (this.current === name && !restart) return;
        const tag = this.tags[name];
        if (!tag) return;
        this.current = name;
        this.tag = tag;
        this.index = tag.from;
        this.timer = 0;
        this.loop = loop;
        this.finished = false;
    }

    update(dtMs) {
        if (!this.ready || !this.tag || this.finished) return;
        this.timer += dtMs;
        let duration = this.frames[this.index].duration;
        while (this.timer >= duration) {
            this.timer -= duration;
            if (this.index < this.tag.to) {
                this.index++;
            } else if (this.loop) {
                this.index = this.tag.from;
            } else {
                this.finished = true;
                break;
            }
            if (this.onFrame) this.onFrame(this.current, this.index - this.tag.from);
            duration = this.frames[this.index].duration;
        }
    }

    // Returns false when no sprite is loaded, so the caller can draw a placeholder instead.
    draw(ctx, x, y, flip = false) {
        if (!this.ready || !this.tag) return false;
        const f = this.frames[this.index].frame;
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(this.image, f.x, f.y, f.w, f.h, -f.w / 2, -f.h, f.w, f.h);
        ctx.restore();
        return true;
    }
}