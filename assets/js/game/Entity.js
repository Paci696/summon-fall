export class Entity {
    constructor(x, y, maxHp) {
        this.x = x;
        this.y = y;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.alive = true;
        this.radius = 8;
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        if (this.hp === 0) this.alive = false;
    }

    drawHpBar(ctx, sx, top, width = 18, always = false) {
        if (!always && this.hp >= this.maxHp) return;
        const x = Math.round(sx - width / 2);
        const y = Math.round(top);
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 1, y - 1, width + 2, 5);
        ctx.fillStyle = '#c03030';
        ctx.fillRect(x, y, width, 3);
        ctx.fillStyle = '#4fd05a';
        ctx.fillRect(x, y, Math.round(width * this.hp / this.maxHp), 3);
    }
}