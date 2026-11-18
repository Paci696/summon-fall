import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';
import { TILE } from './GameMap.js';
import { SpriteSkin } from './SpriteSkin.js';
import { getUnitSheet, getBossSheet } from './UnitArt.js';
import { getHeroSheet } from './HeroArt.js';
import { getNightSheet } from './NightArt.js';

const LOOKS = {
    miner:         { shape: 'circle',   color: '#e0c040' },
    swordsman:     { shape: 'square',   color: '#4a7fe0' },
    archer:        { shape: 'triangle', color: '#3fbf6a' },
    mage:          { shape: 'diamond',  color: '#a050e0' },
    slime:         { shape: 'blob',     color: '#6adf6a' },
    goblin:        { shape: 'circle',   color: '#8bbf3f' },
    goblin_archer: { shape: 'triangle', color: '#b0c040' },
    giant:         { shape: 'square',   color: '#a0642c' },
    healer:        { shape: 'circle',   color: '#7fe08a' },
    
};
const ANIM_FOR_STATE = { moving: 'walk', attacking: 'attack', mining: 'attack', idle: 'idle' };
const RANK_FILTERS = ['', 'saturate(1.4) brightness(1.15)', 'hue-rotate(45deg) saturate(1.8) brightness(1.3)']; // base, elite, godly
const RANK_RING = ['', '#6fd0ff', '#ff80ff'];
const TIER_FILTERS = [
    '',
    'hue-rotate(50deg) saturate(1.3)',
    'hue-rotate(150deg) saturate(1.4)',
    'hue-rotate(250deg) saturate(1.5)',
    'hue-rotate(320deg) saturate(1.8) contrast(1.2)',
];

const UNDEAD_FILTER = 'sepia(1) hue-rotate(65deg) saturate(2.4) brightness(0.8)';   // raised dead look green

export class Unit extends Entity {
    constructor(stats, faction, x, y) {
        super(x, y, stats.hp);
        this.stats = stats;
        this.name = stats.name;
        this.rank = stats.unit_tier || 0; // 0 base, 1 elite, 2 godly
        this.classType = stats.class_type;
        this.faction = faction;
        this.speed = stats.speed;
        this.radius = this.classType === 'giant' ? 14 : 8;
        this.facing = 1;
        this.state = 'idle';
        this.fallOffset = 0;
        this.animator = null; // set later when sprites exist

        this.game = null;       // set by Game.addUnit()
        this.selected = false;
        this.stance = 'defend'; // attack, defend, hold (player units)
        this.moveOrder = null;
        this.forcedTarget = null;
        this.target = null;
        this.attackCd = 0;
        this.path = null;
        this.pathKey = '';
        this.repathTimer = 0;
        this.prevX = x;
        this.prevY = y;
        this.threat = 0; // how much score this mob is worth when killed
        this.isUndead = false;  // raised by the Necromancer
        this.lifespan = null;   // seconds until an undead crumbles
    }
    attachSprite(assets) {
        const img = assets.getImage('units');
        const atlas = assets.getJson('units');
        let spot = atlas && atlas.units && atlas.units[this.stats.sprite_key];
        let source = img;
        let cell = atlas ? atlas.cell : 32;
        if (!spot) {                                   // not drawn by hand yet: use the generated sprite
            const key = String(this.stats.sprite_key);
            const gen = key === 'boss' ? getBossSheet()
                : key === 'boss_bone' || key === 'zombie' || key === 'ghoul' ? getNightSheet(key)
                : (key.startsWith('hero_') ? getHeroSheet() : getUnitSheet());
            spot = gen.units[this.stats.sprite_key];
            source = gen.canvas;
            cell = gen.cell;
        }
        if (!source || !spot) return; // no sprite at all: keep the placeholder shape
        this.animator = new SpriteSkin(source, cell, spot, this.classType === 'slime');
    }
    canFight() { return true; }

    startFalling() {
        this.state = 'falling';
        this.fallOffset = 180;
    }

    update(dt, game) {
        if (this.lifespan !== null) {
            this.lifespan -= dt;
            if (this.lifespan <= 0 && this.alive) { this.takeDamage(this.hp + 9999); return; }
        }
        this.attackCd = Math.max(0, this.attackCd - dt);
        if (this.hitFlash > 0) this.hitFlash -= dt;
        if (this.healGlow > 0) this.healGlow -= dt;
        if (this.buffT > 0) this.buffT -= dt;      // War Cry: more damage
        if (this.slowT > 0) this.slowT -= dt;      // Frost Nova: slower
        this.repathTimer -= dt;

        if (this.state === 'falling') {
            this.fallOffset -= 420 * dt;
            if (this.fallOffset <= 0) {
                this.fallOffset = 0;
                this.state = 'idle';
                game.effects.puff(this.x, this.y);
            }
            return;
        }
        if (this.animator) {
            this.animator.play(ANIM_FOR_STATE[this.state] || 'idle');
            this.animator.update(dt * 1000);
        }
        if (this.canFight()) this.updateCombat(dt, game);
    }

    // ---- combat ----

    acquireRange() {
        if (this.faction === 'mob') return 200;
        if (this.stance === 'attack') return 260;
        if (this.stance === 'hold') return this.stats.attack_range + 12;
        return 180;
    }

    reach(target) {
        return this.stats.attack_range + target.radius;
    }

    distTo(o) {
        return Math.hypot(o.x - this.x, o.y - this.y);
    }

    updateCombat(dt, game) {
        if (this.followMoveOrder(dt)) return;
        if (this.classType === 'healer') { this.updateHealer(dt, game); return; }

        let target = null;
        if (this.forcedTarget && this.forcedTarget.alive) target = this.forcedTarget;
        else this.forcedTarget = null;

        if (!target) {
            const keep = this.target && this.target.alive
                && this.distTo(this.target) <= this.acquireRange() * 1.5
                && (this.stance !== 'hold' || this.distTo(this.target) <= this.reach(this.target));
            target = keep ? this.target : game.findEnemy(this, this.acquireRange());
            this.target = target;
        }

        if (target) {
            if (this.distTo(target) <= this.reach(target)) {
                this.state = 'attacking';
                this.facing = target.x < this.x ? -1 : 1;
                if (this.attackCd <= 0) {
                    this.attack(target);
                    this.attackCd = this.stats.attack_cooldown / 1000 / this.attackSpeedMult();
                }
            } else if (this.stance !== 'hold' || this.forcedTarget || this.faction === 'mob') {
                this.state = 'moving';
                this.moveToward(target.x, target.y, dt);
            } else {
                this.state = 'idle';
            }
            return;
        }
        this.idleBehavior(dt, game);
    }
    // Healer: runs from enemies, heals the most hurt ally in range, otherwise follows the army
    updateHealer(dt, game) {
        const danger = game.findEnemy(this, 70);
        if (danger && this.stance !== 'hold') {
            const dx = this.x - danger.x, dy = this.y - danger.y;
            const d = Math.hypot(dx, dy) || 1;
            this.state = 'moving';
            this.stepToward(this.x + (dx / d) * 60, this.y + (dy / d) * 60, dt);
            return;
        }

        const reach = this.stance === 'hold' ? this.stats.attack_range : 220;
        const patient = game.findPatient(this, reach);
        if (patient) {
            if (this.distTo(patient) <= this.stats.attack_range) {
                this.state = 'attacking';
                this.facing = patient.x < this.x ? -1 : 1;
                if (this.attackCd <= 0) {
                    game.castHeal(this, patient);
                    this.attackCd = this.stats.attack_cooldown / 1000;
                }
                return;
            }
            if (this.stance !== 'hold') {
                this.state = 'moving';
                this.moveToward(patient.x, patient.y, dt);
                return;
            }
        }

        if (this.stance !== 'hold') {
            const c = game.armyCenter();
            if (c && Math.hypot(c.x - this.x, c.y - this.y) > 70) {
                this.state = 'moving';
                this.moveToward(c.x, c.y, dt);
                return;
            }
            if (!c) { this.idleBehavior(dt, game); return; }
        }
        this.state = 'idle';
    }
    idleBehavior(dt, game) {
        if (this.faction === 'mob') {
            this.state = 'moving';
            this.moveToward(game.base.x, game.base.y, dt); // march on the player's statue
            return;
        }
        if (this.stance === 'attack') {
            const nest = game.nearestNest(this.x, this.y);
            if (nest && Math.hypot(nest.x - this.x, nest.y - this.y) > 150) {
                this.state = 'moving';
                this.moveToward(nest.x, nest.y, dt);
                return;
            }
        } else if (this.stance === 'defend') {
            const rx = game.base.x + 110, ry = game.base.y;
            if (Math.hypot(rx - this.x, ry - this.y) > 90) {
                this.state = 'moving';
                this.moveToward(rx, ry, dt);
                return;
            }
        }
        this.state = 'idle';
        
    }

    damageNow() {
        return this.stats.damage * (this.buffT > 0 ? this.buffMult : 1);
    }

    attackSpeedMult() {
        return 1;
    }

    attack(target) {
        const type = this.stats.attack_type;
        if (type === 'ranged' || type === 'area') {
            this.game.projectiles.push(new Projectile(this.x, this.y - this.radius, target, this.damageNow(), this.faction, type === 'area' ? 40 : 0));
        } else {
            this.game.dealDamage(target, this.damageNow());
        }
    }

    // ---- movement ----

    // Returns true while a move order is still being carried out
    followMoveOrder(dt) {
        if (!this.moveOrder) return false;
        this.state = 'moving';
        if (this.moveToward(this.moveOrder.x, this.moveOrder.y, dt)) {
            this.moveOrder = null;
            this.state = 'idle';
        }
        return true;
    }

    // Walks straight when the way is clear, otherwise follows an A* path. True when arrived.
    moveToward(tx, ty, dt) {
        const pf = this.game && this.game.pathfinder;
        if (!pf || pf.lineClear(this.x, this.y, tx, ty)) {
            this.path = null;
            this.pathKey = '';
            return this.stepToward(tx, ty, dt);
        }
        const key = Math.floor(tx / TILE) + ',' + Math.floor(ty / TILE);
        if ((!this.path || this.pathKey !== key) && this.repathTimer <= 0) {
            this.path = pf.findPath(this.x, this.y, tx, ty);
            this.pathKey = key;
            this.repathTimer = 0.4;
        }
        if (!this.path || this.path.length === 0) return this.stepToward(tx, ty, dt);

        const wp = this.path[0];
        if (this.stepToward(wp.x, wp.y, dt)) {
            this.path.shift();
            if (this.path.length === 0) {
                this.path = null;
                this.pathKey = '';
                return true;
            }
        }
        return false;
    }

    stepToward(tx, ty, dt) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        const step = this.speed * (this.slowT > 0 ? 0.5 : 1) * dt;
        if (dist <= step) {
            this.x = tx;
            this.y = ty;
            return true;
        }
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        if (Math.abs(dx) > 0.5) this.facing = dx < 0 ? -1 : 1;
        return false;
    }

    // ---- drawing ----

    draw(ctx, camera) {
        const s = camera.worldToScreen(this.x, this.y);
        if (s.x < -40 || s.x > camera.viewW + 40 || s.y < -60 || s.y > camera.viewH + 40) return;
        const r = this.radius;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, r, r / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (this.rank > 0) {
            ctx.strokeStyle = RANK_RING[this.rank];
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, r + 6, (r + 6) / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.selected) {
            ctx.strokeStyle = '#6fff6f';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, r + 3, (r + 3) / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        const feetY = s.y - this.fallOffset;
        if (this.state === 'falling') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillRect(s.x - 4, feetY - 200, 8, 200 + this.fallOffset);
        }

        if (this.healGlow > 0) {
            ctx.fillStyle = 'rgba(110, 255, 150, ' + Math.min(0.5, this.healGlow) + ')';
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, r + 6, (r + 6) / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        const tint = this.isUndead ? UNDEAD_FILTER : this.faction === 'player'
            ? (RANK_FILTERS[this.rank] || '')
            : (this.tier ? TIER_FILTERS[((this.tier - 1) % 4) + 1] : '');
        const filter = ((this.hitFlash > 0 ? 'brightness(2.5) ' : '') + (this.healGlow > 0 ? 'brightness(1.3) ' : '') + tint).trim();
        if (filter) { ctx.save(); ctx.filter = filter; }
        const drewSprite = this.animator && this.animator.draw(ctx, s.x, feetY, this.facing < 0);
        if (!drewSprite) this.drawShape(ctx, s.x, feetY);
        if (filter) ctx.restore();
        this.drawExtras(ctx, s.x, feetY);
        const top = drewSprite ? this.animator.height : 2 * r;
        this.drawHpBar(ctx, s.x, feetY - top - 6);
    }

    drawShape(ctx, x, y) {
        const r = this.radius;
        const look = LOOKS[this.classType] || { shape: 'circle', color: '#999' };
        ctx.fillStyle = look.color;
        ctx.strokeStyle = this.faction === 'player' ? '#ffffff' : '#7a0f0f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        switch (look.shape) {
            case 'circle':   ctx.arc(x, y - r, r, 0, Math.PI * 2); break;
            case 'square':   ctx.rect(x - r, y - 2 * r, 2 * r, 2 * r); break;
            case 'triangle': ctx.moveTo(x, y - 2 * r); ctx.lineTo(x + r, y); ctx.lineTo(x - r, y); ctx.closePath(); break;
            case 'diamond':  ctx.moveTo(x, y - 2 * r); ctx.lineTo(x + r, y - r); ctx.lineTo(x, y); ctx.lineTo(x - r, y - r); ctx.closePath(); break;
            case 'blob':     ctx.arc(x, y, r, Math.PI, 0); ctx.closePath(); break;
        }
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.round(x + this.facing * r * 0.35) - 1, Math.round(y - r * 1.3), 3, 3);
    }

        drawExtras(ctx, x, y) {
        if (this.classType === 'healer' && !this.animator) {   // white cross until you draw a sprite
            const r = this.radius;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(Math.round(x) - 1, Math.round(y - r) - 3, 3, 7);
            ctx.fillRect(Math.round(x) - 3, Math.round(y - r) - 1, 7, 3);
        }
    }
}