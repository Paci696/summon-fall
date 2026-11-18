export class Effects {
    constructor() {
        this.list = [];
    }

    puff(x, y) {
        this.list.push({ type: 'puff', x, y, t: 0, life: 0.4 });
    }

    spark(x, y, color = '#fff') {
        this.list.push({ type: 'spark', x, y, t: 0, life: 0.2, color });
    }

    ping(x, y, color = '#6fff6f') {
        this.list.push({ type: 'ping', x, y, t: 0, life: 0.5, color });
    }

    floatText(x, y, text, color = '#fff') {
        this.list.push({ type: 'text', x, y, t: 0, life: 0.9, text, color });
    }

    update(dt) {
        for (const e of this.list) e.t += dt;
        this.list = this.list.filter((e) => e.t < e.life);
    }

    draw(ctx, camera) {
        for (const e of this.list) {
            const s = camera.worldToScreen(e.x, e.y);
            const k = e.t / e.life;
            ctx.globalAlpha = 1 - k;
            if (e.type === 'puff') {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(s.x, s.y, 4 + k * 18, 2 + k * 9, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else if (e.type === 'spark') {
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.arc(s.x, s.y, 3 + k * 5, 0, Math.PI * 2);
                ctx.fill();
            } else if (e.type === 'ping') {
                ctx.strokeStyle = e.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(s.x, s.y, 6 + k * 10, 3 + k * 5, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = e.color;
                ctx.font = '11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(e.text, s.x, s.y - k * 20);
            }
        }
        ctx.globalAlpha = 1;
    }
}