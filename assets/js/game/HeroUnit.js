// HeroUnit.js - your hero: a stronger Unit with three abilities, equipment bonuses and a revive timer.
import { Unit } from './Unit.js';
import { fxSpawn, fxUpdate, fxDraw } from './HeroSkillFx.js';

export const HERO_KEYS = ['KeyR', 'KeyT', 'KeyY'];       // ability hotkeys (change them here)
const AIMED = new Set(['dash', 'line', 'area']);          // these are cast at the mouse cursor

export class HeroUnit extends Unit {
    constructor(hd, x, y) {
        const sk = hd.skills || {}, eq = hd.equipment || {};
        // hero level (1-100): +1.2% HP and damage per level above 1 (set in play.php, capped at 100)
        const level = Math.max(1, Math.min(100, Number((window.GAME_CONFIG || {}).heroLevel) || 1));
        const lvBonus = (level - 1) * 1.2;
        const mult = (skillKey, eqKey) => 1 + ((sk[skillKey] || 0) + (eq[eqKey] || 0) + ((skillKey === 'hp' || skillKey === 'damage') ? lvBonus : 0)) / 100;
        const stats = {
            id: -hd.id, name: hd.name, role: hd.role, class_type: 'hero',
            hp: Math.round(hd.hp * mult('hp', 'hp_pct')),
            damage: Math.round(hd.damage * mult('damage', 'damage_pct')),
            speed: Math.round(hd.speed * mult('speed', 'speed_pct')),
            attack_range: hd.attack_range, attack_cooldown: hd.attack_cooldown,
            attack_type: hd.attack_type, sprite_key: hd.sprite_key,
            unit_tier: 0, cost: 0, drop_souls: 0, drop_chance: 0,
        };
        super(stats, 'player', x, y);
        this.isHero = true;
        this.level = level;
        this.radius = 10;
        this.dmgMult = mult('damage', 'damage_pct');
        this.abilityMult = 1 + (sk.ability || 0) / 100;
        this.lifesteal = (eq.lifesteal_pct || 0) / 100;
        const cdr = Math.min(60, (sk.cdr || 0) + (eq.cdr_pct || 0));
        this.reviveSec = Math.max(10, Math.round(hd.revive_sec * (1 - (sk.revive || 0) / 100)));
        this.abilities = (hd.abilities || []).map((a) => ({ ...a, cooldownMax: Math.max(2, a.cooldown_sec * (1 - cdr / 100)) }));
        this.cd = this.abilities.map(() => 0);
        this.shieldT = 0;
        this.rapidT = 0;
        this.dash = null;
        this.wolfT = 0;                    // Lycan: seconds left in wolf form
        this.isNecro = String(hd.name).toLowerCase() === 'necromancer';
        this.raiseChance = 0.25 + (sk.raise || 0) / 100;     // chance a kill near you rises as undead
        this.maxUndead = 3 + Math.round(sk.horde || 0);      // undead allowed at once
        this.humanStats = null;
        this.humanSpeed = 0;
    }

    static isAimed(ability) {
        return AIMED.has(ability.ability_type);
    }

    update(dt, game) {
        fxUpdate(this, dt);
        for (let i = 0; i < this.cd.length; i++) if (this.cd[i] > 0) this.cd[i] = Math.max(0, this.cd[i] - dt);
        if (this.shieldT > 0) this.shieldT -= dt;
        if (this.rapidT > 0) this.rapidT -= dt;
        if (this.wolfT > 0) {
            this.wolfT -= dt;
            if (this.wolfT <= 0) this.leaveWolf();
        }
        if (this.dash) { this.updateDash(dt, game); return; }
        super.update(dt, game);
    }

    attackSpeedMult() {
        return this.rapidT > 0 ? this.rapidPower : 1;
    }

    attack(target) {
        super.attack(target);
        const ls = this.lifesteal + (this.wolfT > 0 ? 0.15 : 0);   // wolf form drinks life
        if (ls > 0) this.game.healUnit(this, this.damageNow() * ls);
    }

    takeDamage(amount) {
        if (this.shieldT > 0) amount *= 1 - this.shieldPct;
        super.takeDamage(amount);
    }

    // ---- abilities ----

    ready(slot) {
        return this.alive && this.state !== 'falling' && this.abilities[slot] && this.cd[slot] <= 0;
    }

    // (tx, ty) = world point under the cursor; used by aimed abilities
    cast(slot, tx, ty) {
        const a = this.abilities[slot];
        if (!this.ready(slot)) return false;
        const g = this.game;
        const power = a.power * this.dmgMult * this.abilityMult;
        const enemies = () => g.units.filter((u) => u.alive && u.faction === 'mob' && u.state !== 'falling');
        let dx = tx - this.x, dy = ty - this.y;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len; dy /= len;
        if (len < 2) { dx = this.facing; dy = 0; }
        this.facing = dx < 0 ? -1 : 1;

        switch (a.ability_type) {
            case 'dash': {
                this.dash = { dx, dy, t: 0.26, hit: new Set(), power };
                g.sfx.play('boom');
                break;
            }
            case 'shield':
                this.shieldT = a.duration_sec;
                this.shieldPct = Math.min(0.8, a.power / 100);
                g.heroFx.push({ type: 'ring', x: this.x, y: this.y, r: 22, t: 0, life: 0.6, color: '120,200,255' });
                break;
            case 'buff':
                if (a.radius > 0) {                                     // team buff (War Cry)
                    for (const u of g.units) {
                        if (!u.alive || u.faction !== 'player' || Math.hypot(u.x - this.x, u.y - this.y) > a.radius) continue;
                        u.buffT = a.duration_sec;
                        u.buffMult = 1 + (a.power / 100) * this.abilityMult;
                    }
                    g.heroFx.push({ type: 'ring', x: this.x, y: this.y, r: a.radius, t: 0, life: 0.7, color: '255,170,60' });
                } else {                                                // self buff (Rapid Fire)
                    this.rapidT = a.duration_sec;
                    this.rapidPower = 1 + (a.power / 100) * this.abilityMult;
                    g.heroFx.push({ type: 'ring', x: this.x, y: this.y, r: 18, t: 0, life: 0.5, color: '255,230,120' });
                }
                break;
            case 'line': {
                const LEN = 240;
                const x1 = this.x + dx * LEN, y1 = this.y + dy * LEN;
                for (const u of enemies()) {
                    const t = Math.max(0, Math.min(1, ((u.x - this.x) * dx + (u.y - this.y) * dy) / LEN));
                    const d = Math.hypot(u.x - (this.x + dx * LEN * t), u.y - (this.y + dy * LEN * t));
                    if (d <= a.radius + u.radius) g.dealDamage(u, power);
                }
                g.heroFx.push({ type: 'line', x0: this.x, y0: this.y - 10, x1, y1: y1 - 10, t: 0, life: 0.3 });
                g.sfx.play('boom');
                break;
            }
            case 'area': {
                const RANGE = 240;
                const d = Math.min(RANGE, len);
                const zx = this.x + dx * d, zy = this.y + dy * d;
                if (a.duration_sec > 0) {                               // Arrow Rain: several hits over time
                    g.heroZones.push({ x: zx, y: zy, r: a.radius, t: 0, delay: 0.3, ticks: 4, every: a.duration_sec / 4, next: 0, damage: power * 0.35, kind: 'rain' });
                } else {                                                // Fireball: one explosion
                    g.heroZones.push({ x: zx, y: zy, r: a.radius, t: 0, delay: 0.45, ticks: 1, every: 1, next: 0, damage: power, kind: 'fire' });
                }
                g.sfx.play('boom');
                break;
            }
            case 'nova':
                for (const u of enemies()) {
                    if (Math.hypot(u.x - this.x, u.y - this.y) <= a.radius) {
                        g.dealDamage(u, power);
                        u.slowT = a.duration_sec;
                    }
                }
                g.heroFx.push({ type: 'ring', x: this.x, y: this.y, r: a.radius, t: 0, life: 0.6, color: '140,220,255' });
                g.sfx.play('boom');
                break;
            case 'raise': {                                             // Necromancer: Dark Ritual raises every corpse nearby
                const n = g.raiseCorpses(this.x, this.y, a.radius, this);
                g.heroFx.push({ type: 'ring', x: this.x, y: this.y, r: a.radius, t: 0, life: 0.9, color: '120,255,140' });
                g.showBanner(n > 0 ? 'The dead rise!' : 'No corpses nearby');
                break;
            }
            case 'shift': {                                             // Lycan: turn into the wolf for a while
                this.enterWolf(a.duration_sec, a.power);
                break;
            }
            case 'heal':
                for (const u of g.units) {
                    if (!u.alive || u.faction !== 'player' || u.state === 'falling') continue;
                    if (Math.hypot(u.x - this.x, u.y - this.y) > a.radius) continue;
                    const done = g.healUnit(u, power);
                    if (done > 0) g.effects.floatText(u.x, u.y - u.radius * 2 - 6, '+' + Math.round(done), '#6fff9a');
                    g.healEffect(this, u, false);
                }
                g.heroFx.push({ type: 'ring', x: this.x, y: this.y, r: a.radius, t: 0, life: 0.6, color: '120,255,160' });
                break;
        }
        fxSpawn(this, a, { dx, dy, zx: this.x + dx * Math.min(240, len), zy: this.y + dy * Math.min(240, len) });
        this.cd[slot] = a.cooldownMax;
        return true;
    }

    // ---- wolf form (Lycan) ----

    enterWolf(seconds, power) {
        const g = this.game;
        if (this.wolfT > 0) { this.wolfT = seconds; return; }
        this.humanStats = this.stats;
        this.humanSpeed = this.speed;
        this.stats = {
            ...this.stats,
            sprite_key: this.stats.sprite_key + '_wolf',
            attack_type: 'melee',
            attack_range: 30,
            damage: Math.round(this.stats.damage * (1 + power / 100) * 1.6),
            attack_cooldown: Math.round(this.stats.attack_cooldown * 0.6),
        };
        this.speed = Math.round(this.speed * 1.25);
        this.radius = 12;
        this.wolfT = seconds;
        this.target = null;
        this.attachSprite(g.assets);
        g.healUnit(this, g.maxHpOf(this) * 0.25);
        g.effects.puff(this.x, this.y);
        g.heroFx.push({ type: 'ring', x: this.x, y: this.y, r: 34, t: 0, life: 0.7, color: '255,90,60' });
        g.shake = Math.max(g.shake, 0.5);
        g.showBanner('AWOOO!');
    }

    leaveWolf() {
        if (!this.humanStats) return;
        this.stats = this.humanStats;
        this.speed = this.humanSpeed;
        this.radius = 10;
        this.humanStats = null;
        this.target = null;
        this.attachSprite(this.game.assets);
        this.game.effects.puff(this.x, this.y);
        this.wolfT = 0;
    }

    updateDash(dt, game) {
        const d = this.dash;
        const speed = 110 / 0.26;
        const step = Math.min(dt, d.t);
        this.x += d.dx * speed * step;
        this.y += d.dy * speed * step;
        this.state = 'moving';
        this.facing = d.dx < 0 ? -1 : 1;
        this.moveOrder = null;
        for (const u of game.units) {
            if (!u.alive || u.faction !== 'mob' || d.hit.has(u) || u.state === 'falling') continue;
            if (Math.hypot(u.x - this.x, u.y - this.y) <= 26 + u.radius) {
                d.hit.add(u);
                game.dealDamage(u, d.power);
            }
        }
        if (this.animator) { this.animator.play('walk'); this.animator.update(dt * 1000); }
        d.t -= dt;
        if (d.t <= 0) this.dash = null;
    }

    drawExtras(ctx, x, y) {
        fxDraw(this, ctx);
        const r = this.radius;
        ctx.save();
        ctx.strokeStyle = '#ffcf5a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x, y, r + 8, (r + 8) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (this.wolfT > 0) {
            ctx.strokeStyle = 'rgba(255, 90, 60, 0.9)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(x, y, r + 12, (r + 12) / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (this.shieldT > 0) {
            ctx.strokeStyle = 'rgba(130, 210, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x, y - r, r + 6, r + 10, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (this.rapidT > 0 || this.buffT > 0) {
            ctx.fillStyle = this.buffT > 0 ? '#ffaa3c' : '#ffe680';
            const top = this.animator ? this.animator.height : 2 * r;
            const bx = Math.round(x), by = Math.round(y - top - 16 + Math.sin(performance.now() / 150) * 1.5);
            ctx.fillRect(bx - 2, by, 5, 2);
            ctx.fillRect(bx - 1, by - 2, 3, 2);
        }
        ctx.restore();
    }
}