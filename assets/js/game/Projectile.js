export class Projectile {
    constructor(x, y, target, damage, faction, splash = 0) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.faction = faction;
        this.splash = splash;
        this.speed = splash > 0 ? 190 : 260;
        this.alive = true;
        this.aimX = target.x;
        this.aimY = target.y - target.radius;
    }

    update(dt, game) {
        if (this.target.alive) {
            this.aimX = this.target.x;
            this.aimY = this.target.y - this.target.radius;
        } else if (this.splash <= 0) {
            this.alive = false;
            return;
        }
        const dx = this.aimX - this.x, dy = this.aimY - this.y;
        const dist = Math.hypot(dx, dy);
        const step = this.speed * dt;
        if (dist <= step + 2) {
            this.hit(game);
            this.alive = false;
            return;
        }
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
    }

    hit(game) {
        if (this.target.alive) game.dealDamage(this.target, this.damage);
        if (this.splash <= 0) return;
        for (const u of game.units) {
            if (u === this.target || !u.alive || u.faction === this.faction || u.state === 'falling') continue;
            if (Math.hypot(u.x - this.x, (u.y - u.radius) - this.y) <= this.splash) {
                game.dealDamage(u, Math.round(this.damage * 0.6));
            }
        }
        game.effects.puff(this.x, this.y + 6);
        game.effects.spark(this.x, this.y, '#c080ff');
    }

    draw(ctx, camera) {
        const s = camera.worldToScreen(this.x, this.y);
        if (this.splash > 0) {
            ctx.fillStyle = 'rgba(190, 100, 255, 0.35)';
            ctx.beginPath();
            ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#d9a0ff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
            return;
        }
        ctx.fillStyle = this.faction === 'player' ? '#ffffff' : '#ffa040';
        ctx.fillRect(s.x - 2, s.y - 1, 4, 2);
    }
}