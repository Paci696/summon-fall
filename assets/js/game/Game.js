import { Api } from './Api.js';
import { Assets } from './Assets.js';
import { Input } from './Input.js';
import { Camera } from './Camera.js';
import { GameMap, TILE } from './GameMap.js';
import { Minimap } from './Minimap.js';
import { Unit } from './Unit.js';
import { Miner } from './Miner.js';
import { Base } from './Base.js';
import { GoldMine } from './GoldMine.js';
import { Effects } from './Effects.js';
import { SummonBar } from './SummonBar.js';
import { StanceBar } from './StanceBar.js';
import { Pathfinder } from './Pathfinder.js';
import { WaveSpawner } from './WaveSpawner.js';
import { DayNight } from './DayNight.js';
import { Tutorial } from './Tutorial.js';
import { applyBonuses, flatBonus } from './Bonuses.js';
import { Sfx } from './Sfx.js';
import { getArt } from './art.js';
import { Music } from './Music.js';
import { HeroUnit, HERO_KEYS } from './HeroUnit.js';
import { getHeroSheet } from './HeroArt.js';
import { drawItemIcon, RARITY_COLORS } from './ItemArt.js';

const RAISE_RANGE = 260;      // Necromancer: kills this close to you can rise
const RAISE_RUN_CAP = 40;     // most undead you can raise in one run
const RAISE_LIFE = 35;        // seconds before a raised unit crumbles

export const VIEW_W = 640;
export const VIEW_H = 360;
const PAN_SPEED = 360;
const EDGE_SIZE = 10;
const START_GOLD = 200;
const MINE_GOLD = Infinity;   // the one mine never runs out
const STATUE_HP = 1000;
const SUMMON_COOLDOWN = 1.0;
const MAX_MINERS = 10;
const DELETE_REFUND = 0;   // fraction of the gold cost returned when you delete a unit (0 = none)
const LOADOUT_SLOTS = 10;
const DROP_CHANCE = 0.04;      // chance that a monster drops an item (bosses always drop)
const PICKUP_LIFE = 60;        // seconds an item stays on the ground
const METEOR_COOLDOWN = 25;
const METEOR_DAMAGE = 60;
const METEOR_DAMAGE_PER_LEVEL = 40;
const METEOR_RADIUS = 64;

export class Game {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;

        this.api = new Api(config.baseUrl, config.csrf);
        this.assets = new Assets(config.baseUrl);
        this.input = new Input(canvas);
        this.map = new GameMap(config.mapId || 1);
        this.camera = new Camera(VIEW_W, VIEW_H, this.map.widthPx, this.map.heightPx);
        this.minimap = new Minimap(this.map, this.camera, VIEW_W - 152, VIEW_H - 89, 144, 81);
        this.pathfinder = new Pathfinder(this.map);
        this.effects = new Effects();
        this.nests = this.map.nests.map((n) => ({ x: n.tx * TILE + TILE / 2, y: n.ty * TILE + TILE / 2 }));

        this.data = null;
        this.bonuses = [];
        this.summonable = [];
        this.units = [];
        this.projectiles = [];
        this.mines = [];
        this.base = null;
        this.summonBar = null;
        this.stanceBar = null;
        this.spawner = null;

        this.gold = 0;
        this.souls = 0;
        this.kills = 0;
        this.threatKilled = 0;
        this.summonCooldown = 0;
        this.summonCooldownMax = 0;
        this.defaultStance = 'defend';
        this.selected = new Set();
        this.drag = null;
        this.paused = false;
        this.gameOver = false;
        this.endReason = '';
        this.runMessage = '';
        this.debugUsed = false;
        this.tutorial = null;
        this.totalGold = 0;      // gold delivered by miners (tutorial uses it)
        this.ordersIssued = 0;
        this.stanceChanges = 0;
        this.meteorLevel = 0;
        this.meteorCooldown = 0;
        this.meteors = [];
        this.sfx = new Sfx();
        this.maxMiners = MAX_MINERS;
        this.deleteArm = 0;
        this.deleteArmCount = 0;
        this.healFx = [];
        this.unitsDeleted = 0;
        this.music = new Music();
        this.musicTimer = 0;
        this.runTime = 0;
        this.saveDone = true;
        this.shake = 0;
        this.meteorAiming = false;
        this.ignoreUp = false;
        this.banner = null;

        // hero, abilities, item drops
        this.heroData = null;
        this.heroUnit = null;
        this.heroRevive = 0;
        this.heroAiming = -1;
        this.heroFx = [];
        this.heroZones = [];
        this.pickups = [];
        this.loot = [];
        this.bossKills = 0;
        this.corpses = [];      // fresh enemy corpses the Necromancer can raise
        this.raisedTotal = 0;   // undead raised this run (capped)

        this.running = false;
        this.lastTime = 0;
        this.fps = 60;
    }

    async start() {
        this.ctx.imageSmoothingEnabled = false;
        this.data = await this.api.loadUnits();
        await this.assets.loadSprite('units', '/assets/sprites/units/units');
        this.bonuses = this.data.bonuses;

        const raw = this.data.player_units;
        const picked = this.config.mode === 'tutorial' ? [] : (this.data.loadout || []).map((id) => raw.find((u) => u.id === id)).filter(Boolean);
        this.summonable = (picked.length ? picked : raw.slice(0, LOADOUT_SLOTS)).map((u) => applyBonuses(u, this.bonuses));
        this.gold = START_GOLD + flatBonus(this.bonuses, 'start_gold');
        this.meteorLevel = Math.round(flatBonus(this.bonuses, 'meteor'));
        this.summonCooldownMax = SUMMON_COOLDOWN * Math.max(0.3, 1 + flatBonus(this.bonuses, 'summon_cooldown') / 100);

        this.base = new Base(this.map.playerBase, STATUE_HP);
        this.mines = this.map.mines.map((m) => new GoldMine(m, MINE_GOLD));
        this.summonBar = new SummonBar(this);
        this.stanceBar = new StanceBar(this);
        this.camera.centerOn(this.base.x, this.base.y - 40);
        if (this.config.mode !== 'tutorial' && this.data.hero) {
            this.heroData = this.data.hero;
            this.spawnHero();
        }

        if (this.config.mode === 'endless') {
            await this.api.post('/api/run_start.php', {}).catch((e) => console.warn('Run start failed:', e.message));
            this.spawner = new WaveSpawner(this);
            this.dayNight = new DayNight(this);
        }
        if (this.config.mode === 'tutorial') this.tutorial = new Tutorial(this);
        this.music.start();
        this.running = true;
        requestAnimationFrame((t) => { this.lastTime = t; this.loop(t); });
    }

    loop(now) {
        if (!this.running) return;
        const dt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        this.fps = this.fps * 0.9 + (1 / Math.max(dt, 0.001)) * 0.1;

        this.update(dt);
        this.render();
        this.input.endFrame();
        requestAnimationFrame((t) => this.loop(t));
    }

    // ---- run results ----

    get score() {
        return Math.round(this.threatKilled * 10) + 50 * (this.spawner ? this.spawner.wave : 0);
    }

    showBanner(text) {
        this.banner = { text, time: 2.5 };
    }

    endRun(reason) {
        if (this.gameOver) return;
        this.gameOver = true;
        this.paused = false;
        this.endReason = reason;
        this.music.stop();
        this.submitRun();
    }

    async submitRun() {
        this.saveDone = false;
        try {
            if (!this.spawner) { this.runMessage = 'Practice run - not saved.'; return; }
            if (this.debugUsed) { this.runMessage = 'Debug keys were used - run not saved.'; return; }
            if (this.score === 0) { this.runMessage = 'Nothing to save yet.'; return; }
            this.runMessage = 'Saving run...';
            try {
                const r = await this.api.post('/api/score.php', {
                    score: this.score,
                    waves_reached: this.spawner.wave,
                    kills: this.kills,
                    souls_earned: this.souls,
                    map_id: this.config.mapId || 1,
                    drops: this.loot.map((i) => i.id),
                    boss_kills: this.bossKills,
                });
                this.runMessage = 'Saved! +' + r.souls_banked + ' souls banked';
            } catch (e) {
                this.runMessage = 'Could not save: ' + e.message;
            }
        } finally {
            this.saveDone = true;
        }
    }

    // ---- helpers ----

    addUnit(unit) {
        unit.game = this;
        unit.attachSprite(this.assets);
        this.units.push(unit);
        return unit;
    }

    addGold(amount, x, y) {
        this.gold += amount;
        this.sfx.play('coin');
        this.totalGold += amount;
        this.effects.floatText(x, y - 20, '+' + amount, '#ffd84a');
    }

    nearestMine(x, y) {
        let best = null, bestDist = Infinity;
        for (const m of this.mines) {
            if (m.gold <= 0) continue;
            const d = Math.hypot(m.x - x, m.y - y);
            if (d < bestDist) { best = m; bestDist = d; }
        }
        return best;
    }

    nearestNest(x, y) {
        let best = null, bestDist = Infinity;
        for (const n of this.nests) {
            const d = Math.hypot(n.x - x, n.y - y);
            if (d < bestDist) { best = n; bestDist = d; }
        }
        return best;
    }

    findEnemy(unit, range) {
        let best = null, bestD = range;
        for (const o of this.units) {
            if (!o.alive || o.faction === unit.faction || o.state === 'falling') continue;
            const d = Math.hypot(o.x - unit.x, o.y - unit.y);
            if (d < bestD) { best = o; bestD = d; }
        }
        if (unit.faction === 'mob' && this.base.alive) {
            const d = Math.hypot(this.base.x - unit.x, this.base.y - unit.y) - this.base.radius;
            if (d < bestD) best = this.base;
        }
        return best;
    }

    dealDamage(target, amount) {
        target.takeDamage(amount);
        target.hitFlash = 0.12;
        this.effects.spark(target.x, target.y - target.radius, '#ff5050');
        this.effects.floatText(target.x, target.y - target.radius * 2 - 6, String(Math.round(amount)),
            target.faction === 'player' ? '#ff8080' : '#ffffff');
        this.sfx.play('hit');
    }

    onUnitDied(u) {
        if (u.isHero) {
            this.heroUnit = null;
            this.heroAiming = -1;
            this.heroRevive = u.reviveSec;
            this.showBanner('Hero fallen - back in ' + u.reviveSec + 's');
        }
        if (u.isBoss) { this.shake = 1; this.bossKills++; this.showBanner('Boss defeated!'); }
        this.effects.puff(u.x, u.y);
        this.sfx.play('die');
        this.selected.delete(u);
        if (u.faction === 'mob' && u.burned) {
            this.effects.puff(u.x, u.y);                // burned by the sun: no loot, no kill credit
        } else if (u.faction === 'mob') {
            this.corpses.push({ x: u.x, y: u.y, stats: u.stats, boss: !!u.isBoss, age: 0 });
            this.tryRaise(u);
            this.kills++;
            this.threatKilled += u.threat || 0;
            this.rollDrop(u);
            const dropSouls = Math.round(u.stats.drop_souls * (this.dayNight ? this.dayNight.soulMult : 1));
            if (dropSouls > 0 && Math.random() < u.stats.drop_chance) {
                this.souls += dropSouls;
                this.effects.floatText(u.x, u.y - 24, '+' + dropSouls + ' soul', '#c080ff');
            }
        }
    }
    // ---- necromancer: raise the dead ----

    undeadCount() {
        let n = 0;
        for (const u of this.units) if (u.alive && u.isUndead) n++;
        return n;
    }

    // chance to raise the unit that just died (only if a Necromancer is alive and close)
    tryRaise(u) {
        const h = this.heroUnit;
        if (!h || !h.alive || !h.isNecro) return;
        if (Math.hypot(u.x - h.x, u.y - h.y) > RAISE_RANGE) return;
        const chance = u.isBoss ? 0.05 + h.raiseChance * 0.2 : h.raiseChance;
        if (Math.random() < chance) this.raiseOne(u.x, u.y, u.stats, !!u.isBoss, h);
    }

    // the Dark Ritual: raise corpses nearby (no dice roll, but caps still apply)
    raiseCorpses(x, y, radius, h) {
        let n = 0;
        for (const c of this.corpses) {
            if (c.raised || Math.hypot(c.x - x, c.y - y) > radius) continue;
            if (this.raiseOne(c.x, c.y, c.stats, c.boss, h)) { c.raised = true; n++; }
        }
        return n;
    }

    raiseOne(x, y, mobStats, boss, h) {
        if (this.raisedTotal >= RAISE_RUN_CAP) return false;
        if (this.undeadCount() >= h.maxUndead) return false;
        const power = Math.min(0.8, (boss ? 0.3 : 0.45) * h.abilityMult);   // weaker than summoned units
        const stats = {
            ...mobStats,
            name: (boss ? 'Risen ' : 'Undead ') + mobStats.name,
            hp: Math.max(10, Math.round(mobStats.hp * power)),
            damage: Math.max(2, Math.round(mobStats.damage * power)),
            unit_tier: 0, cost: 0, drop_souls: 0, drop_chance: 0,
        };
        const z = new Unit(stats, 'player', x, y);
        z.isUndead = true;
        z.lifespan = RAISE_LIFE;
        z.stance = 'attack';
        z.radius = 8;
        this.addUnit(z);
        this.raisedTotal++;
        this.effects.puff(x, y);
        this.effects.floatText(x, y - 22, 'RISE', '#7fe08a');
        return true;
    }

    minerCount() {
        return this.units.filter((u) => u.alive && u.faction === 'player' && u.classType === 'miner').length;
    }
    trySummon(stats) {
        if (this.gameOver || this.summonCooldown > 0 || this.gold < stats.cost) return false;
        this.gold -= stats.cost;
        this.summonCooldown = this.summonCooldownMax;

        const x = this.base.x + 50 + Math.random() * 60;
        const y = this.base.y - 30 + Math.random() * 80;
        const unit = stats.class_type === 'miner'
            ? new Miner(stats, 'player', x, y)
            : new Unit(stats, 'player', x, y);
        unit.stance = this.defaultStance;
        unit.startFalling();
        this.addUnit(unit);
        this.sfx.play('summon');
        return true;
    }

    randomMob() {
        return this.data.mobs[Math.floor(Math.random() * this.data.mobs.length)];
    }

    debugSpawnMob() {
        const m = this.input.mouse;
        if (!m.inside || this.data.mobs.length === 0) return;
        const p = this.camera.screenToWorld(m.x, m.y);
        this.addUnit(new Unit(this.randomMob(), 'mob', p.x, p.y));
    }

    debugWave() {
        const nest = this.nests[Math.floor(Math.random() * this.nests.length)];
        for (let i = 0; i < 6; i++) {
            const p = this.pathfinder.freePoint(nest.x + (Math.random() - 0.5) * 80, nest.y + (Math.random() - 0.5) * 80);
            this.addUnit(new Unit(this.randomMob(), 'mob', p.x, p.y));
        }
    }

    // ---- hero: spawn, revive, abilities ----

    spawnHero() {
        const x = this.base.x + 50 + Math.random() * 60;
        const y = this.base.y - 30 + Math.random() * 80;
        const h = new HeroUnit(this.heroData, x, y);
        h.stance = this.defaultStance;
        h.startFalling();
        this.addUnit(h);
        this.heroUnit = h;
        this.heroRevive = 0;
    }

    updateHero(dt) {
        if (!this.heroData || this.heroUnit) return;
        this.heroRevive -= dt;
        if (this.heroRevive <= 0) {
            this.spawnHero();
            this.showBanner(this.heroData.name + ' returns!');
        }
    }

    heroRect() {
        return { x: VIEW_W - 152, y: 186, w: 144, h: 80 };
    }

    heroButtons() {
        const r = this.heroRect();
        const out = [];
        for (let i = 0; i < 3; i++) out.push({ slot: i, x: r.x + 4 + i * 46, y: r.y + 34, w: 42, h: 42 });
        return out;
    }

    heroPanelContains(px, py) {
        if (!this.heroData) return false;
        const r = this.heroRect();
        return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    }

    heroButtonAt(px, py) {
        if (!this.heroData) return null;
        return this.heroButtons().find((b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) || null;
    }

    // Click on an ability button: self abilities fire at once, aimed ones wait for a click on the map
    clickHeroButton(slot) {
        const h = this.heroUnit;
        if (this.gameOver) return;
        if (!h) { this.showBanner('Hero returns in ' + Math.ceil(this.heroRevive) + 's'); return; }
        const a = h.abilities[slot];
        if (!a) return;
        if (h.cd[slot] > 0) { this.showBanner(a.name + ' ready in ' + Math.ceil(h.cd[slot]) + 's'); return; }
        this.meteorAiming = false;
        if (HeroUnit.isAimed(a)) {
            this.heroAiming = this.heroAiming === slot ? -1 : slot;
        } else {
            h.cast(slot, h.x, h.y);
            this.heroAiming = -1;
        }
    }

    // Hotkey: aimed abilities are cast at the cursor straight away
    hotkeyHero(slot) {
        const h = this.heroUnit;
        if (!h || this.gameOver) return;
        const a = h.abilities[slot];
        if (!a || h.cd[slot] > 0) return;
        const m = this.input.mouse;
        const p = m.inside ? this.camera.screenToWorld(m.x, m.y) : { x: h.x + h.facing * 100, y: h.y };
        h.cast(slot, p.x, p.y);
    }

    castHeroAt(slot, sx, sy) {
        const h = this.heroUnit;
        if (!h) return;
        const p = this.camera.screenToWorld(sx, sy);
        h.cast(slot, p.x, p.y);
    }

    updateHeroEffects(dt) {
        for (const f of this.heroFx) f.t += dt;
        this.heroFx = this.heroFx.filter((f) => f.t < f.life);
        for (const z of this.heroZones) {
            z.t += dt;
            if (z.t < z.delay || z.ticks <= 0) continue;
            z.next -= dt;
            if (z.next > 0 && z.t - dt >= z.delay) continue;
            z.next = z.every;
            z.ticks--;
            for (const u of this.units) {
                if (u.alive && u.faction === 'mob' && u.state !== 'falling' && Math.hypot(u.x - z.x, u.y - z.y) <= z.r + u.radius) {
                    this.dealDamage(u, z.damage);
                }
            }
            if (z.kind === 'fire') { this.effects.puff(z.x, z.y); this.effects.spark(z.x, z.y - 6, '#ff9040'); this.shake = Math.max(this.shake, 0.4); }
        }
        this.heroZones = this.heroZones.filter((z) => z.ticks > 0 || z.t < z.delay + 0.6);
    }

    drawHeroEffects(ctx) {
        if (this.heroUnit && this.heroUnit.isNecro) {                // corpses glow green while you can raise them
            for (const c of this.corpses) {
                const p = this.camera.worldToScreen(c.x, c.y);
                ctx.fillStyle = 'rgba(120, 255, 140, ' + (0.55 * (1 - c.age / 12)) + ')';
                ctx.beginPath(); ctx.ellipse(p.x, p.y, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(230, 255, 230, ' + (0.8 * (1 - c.age / 12)) + ')';
                ctx.fillRect(p.x - 2, p.y - 3, 4, 4);
            }
        }
        for (const f of this.heroFx) {
            const k = f.t / f.life, s = this.camera.worldToScreen(f.x ?? f.x0, f.y ?? f.y0);
            if (f.type === 'ring') {
                ctx.strokeStyle = 'rgba(' + f.color + ', ' + (0.9 * (1 - k)) + ')';
                ctx.lineWidth = 2;
                const rr = f.r * (0.3 + 0.7 * k);
                ctx.beginPath();
                ctx.ellipse(s.x, s.y, rr, rr / 2, 0, 0, Math.PI * 2);
                ctx.stroke();
            } else if (f.type === 'line') {
                const q = this.camera.worldToScreen(f.x1, f.y1);
                ctx.strokeStyle = 'rgba(255, 240, 160, ' + (0.9 * (1 - k)) + ')';
                ctx.lineWidth = 4 * (1 - k) + 1;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(q.x, q.y);
                ctx.stroke();
            }
        }
        for (const z of this.heroZones) {
            const s = this.camera.worldToScreen(z.x, z.y);
            const k = Math.min(1, z.t / z.delay);
            ctx.save();
            if (z.t < z.delay) {
                ctx.strokeStyle = z.kind === 'fire' ? 'rgba(255, 120, 40, 0.9)' : 'rgba(255, 240, 160, 0.9)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.arc(s.x, s.y, z.r * k, 0, Math.PI * 2);
                ctx.stroke();
            } else if (z.kind === 'fire') {
                const age = z.t - z.delay;
                ctx.fillStyle = 'rgba(255, 190, 80, ' + Math.max(0, 0.6 * (1 - age / 0.35)) + ')';
                ctx.beginPath();
                ctx.arc(s.x, s.y, z.r * (0.4 + 0.6 * Math.min(1, age / 0.35)), 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = 'rgba(255, 240, 160, 0.12)';
                ctx.beginPath();
                ctx.arc(s.x, s.y, z.r, 0, Math.PI * 2);
                ctx.fill();
                for (let i = 0; i < 7; i++) {          // falling arrows
                    const ax = s.x + Math.sin(z.t * 40 + i * 2.3) * z.r * 0.8;
                    const ay = s.y - 40 + ((z.t * 260 + i * 37) % 60);
                    ctx.fillStyle = '#e8e0c8';
                    ctx.fillRect(Math.round(ax), Math.round(ay), 1, 6);
                }
            }
            ctx.restore();
        }
        // aiming circle for the hero ability being aimed
        const h = this.heroUnit, m = this.input.mouse;
        if (this.heroAiming >= 0 && h && m.inside) {
            const a = h.abilities[this.heroAiming];
            const s = this.camera.worldToScreen(h.x, h.y);
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 220, 120, 0.9)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            if (a.ability_type === 'area') {
                ctx.beginPath(); ctx.arc(m.x, m.y, a.radius, 0, Math.PI * 2); ctx.stroke();
            } else {
                ctx.beginPath(); ctx.moveTo(s.x, s.y - 10); ctx.lineTo(m.x, m.y); ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.fillStyle = '#ffe9a0';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(a.name + ' - click to cast, right-click to cancel', m.x, m.y - 14);
            ctx.restore();
        }
    }

    drawAbilityIcon(ctx, cx, cy, type, col) {
        ctx.save();
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        if (type === 'dash') {
            ctx.beginPath(); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx + 3, cy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 9, cy); ctx.lineTo(cx + 1, cy - 6); ctx.lineTo(cx + 1, cy + 6); ctx.closePath(); ctx.fill();
        } else if (type === 'shield') {
            ctx.beginPath(); ctx.moveTo(cx - 8, cy - 8); ctx.lineTo(cx + 8, cy - 8); ctx.lineTo(cx + 8, cy + 1); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx - 8, cy + 1); ctx.closePath(); ctx.fill();
        } else if (type === 'buff') {
            ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 8, cy + 6); ctx.lineTo(cx - 8, cy + 6); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#1a1424'; ctx.fillRect(cx - 1, cy - 3, 2, 6);
        } else if (type === 'line') {
            ctx.beginPath(); ctx.moveTo(cx - 10, cy + 6); ctx.lineTo(cx + 5, cy - 4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 10, cy - 7); ctx.lineTo(cx + 2, cy - 7); ctx.lineTo(cx + 8, cy + 0); ctx.closePath(); ctx.fill();
        } else if (type === 'area') {
            ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffffaa'; ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
        } else if (type === 'nova') {
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9); ctx.stroke();
            }
        } else if (type === 'raise') {
            ctx.beginPath(); ctx.arc(cx, cy - 2, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(cx - 3, cy + 3, 6, 5);
            ctx.fillStyle = '#1e1a3c'; ctx.fillRect(cx - 4, cy - 4, 3, 3); ctx.fillRect(cx + 1, cy - 4, 3, 3);
        } else if (type === 'shift') {
            ctx.beginPath(); ctx.arc(cx, cy, 8, Math.PI * 0.15, Math.PI * 1.1); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy, 8, Math.PI * 1.15, Math.PI * 2.1); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 9, cy - 3); ctx.lineTo(cx + 5, cy + 1); ctx.lineTo(cx + 12, cy + 1); ctx.closePath(); ctx.fill();
        } else if (type === 'heal') {
            ctx.fillRect(cx - 2, cy - 8, 4, 16);
            ctx.fillRect(cx - 8, cy - 2, 16, 4);
        }
        ctx.restore();
    }

    drawHeroPanel(ctx) {
        if (!this.heroData || this.gameOver) return;
        const r = this.heroRect();
        const h = this.heroUnit;
        ctx.fillStyle = 'rgba(12, 10, 28, 0.88)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#ffcf5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

        // portrait
        const sheet = getHeroSheet();
        const spot = sheet.units[this.heroData.sprite_key];
        if (spot) {
            ctx.drawImage(sheet.canvas, spot.right[0] * sheet.cell, 0, sheet.cell, sheet.cell, r.x + 3, r.y + 2, 30, 30);
        }
        ctx.textAlign = 'left';
        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffcf5a';
        ctx.fillText(this.heroData.name.toUpperCase(), r.x + 36, r.y + 13);
        const bx = r.x + 36, by = r.y + 19, bw = r.w - 42;
        ctx.fillStyle = '#3a1010';
        ctx.fillRect(bx, by, bw, 7);
        if (h) {
            const ratio = Math.max(0, Math.min(1, h.hp / this.maxHpOf(h)));
            ctx.fillStyle = ratio > 0.5 ? '#4fd05f' : (ratio > 0.25 ? '#e0c030' : '#e03030');
            ctx.fillRect(bx, by, Math.round(bw * ratio), 7);
            ctx.fillStyle = '#fff';
            ctx.font = '8px monospace';
            ctx.fillText(Math.ceil(h.hp) + '/' + Math.ceil(this.maxHpOf(h)), bx + 2, by + 6);
            if (h.isNecro) {
                ctx.fillStyle = '#7fe08a';
                ctx.fillText('UNDEAD ' + this.undeadCount() + '/' + h.maxUndead, bx + 60, by + 6);
            }
            if (h.wolfT > 0) {
                ctx.fillStyle = '#ff7a5a';
                ctx.fillText('WOLF ' + Math.ceil(h.wolfT) + 's', bx + 60, by + 6);
            }
        } else {
            ctx.fillStyle = '#ff8080';
            ctx.font = '8px monospace';
            ctx.fillText('Back in ' + Math.ceil(this.heroRevive) + 's', bx + 2, by + 6);
        }

        const abilities = this.heroData.abilities || [];
        const typeColor = { dash: '#ffb070', shield: '#8fd4ff', buff: '#ffcf5a', line: '#fff0a0', area: '#ff9050', nova: '#a0e4ff', heal: '#7fff9f', shift: '#ff7a5a', raise: '#7fe08a' };
        for (const b of this.heroButtons()) {
            const a = abilities[b.slot];
            if (!a) continue;
            const live = h ? h.abilities[b.slot] : null;
            const cd = h ? h.cd[b.slot] : 0;
            const cdMax = live ? live.cooldownMax : a.cooldown_sec;
            const ready = !!h && cd <= 0;
            const col = typeColor[a.ability_type] || '#fff';
            ctx.fillStyle = 'rgba(30, 26, 60, 0.95)';
            ctx.fillRect(b.x, b.y, b.w, b.h);
            this.drawAbilityIcon(ctx, b.x + b.w / 2, b.y + 18, a.ability_type, ready ? col : '#666');
            if (h && cd > 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(b.x, b.y, b.w, b.h * (cd / cdMax));
                ctx.fillStyle = '#fff';
                ctx.font = '11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(String(Math.ceil(cd)), b.x + b.w / 2, b.y + 22);
            }
            ctx.strokeStyle = this.heroAiming === b.slot ? '#ffffff' : (ready ? col : '#555');
            ctx.lineWidth = this.heroAiming === b.slot ? 2 : 1;
            ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
            ctx.font = '9px monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = ready ? '#ffffff' : '#999';
            ctx.fillText(HERO_KEYS[b.slot].replace('Key', ''), b.x + 3, b.y + 10);
            ctx.textAlign = 'center';
            ctx.fillStyle = ready ? '#ffe9a0' : '#888';
            ctx.font = '7px monospace';
            ctx.fillText(a.name.length > 10 ? a.name.slice(0, 10) : a.name, b.x + b.w / 2, b.y + b.h - 3);
        }

        // tooltip for the ability under the mouse
        const m = this.input.mouse;
        const hb = m.inside ? this.heroButtonAt(m.x, m.y) : null;
        if (hb && abilities[hb.slot]) {
            const a = abilities[hb.slot];
            const lines = [a.name + ' (' + a.cooldown_sec + 's)', a.description, HeroUnit.isAimed(a) ? 'Aimed: hotkey casts at cursor' : 'Instant'];
            ctx.font = '9px monospace';
            const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 10;
            const x = Math.max(4, r.x + r.w - w), y = r.y - 40;
            ctx.fillStyle = 'rgba(10, 10, 25, 0.95)';
            ctx.fillRect(x, y, w, 38);
            ctx.strokeStyle = '#ffcf5a';
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 37);
            ctx.textAlign = 'left';
            ctx.fillStyle = '#ffcf5a';
            ctx.fillText(lines[0], x + 5, y + 12);
            ctx.fillStyle = '#fff';
            ctx.fillText(lines[1], x + 5, y + 23);
            ctx.fillStyle = '#aab';
            ctx.fillText(lines[2], x + 5, y + 34);
        }
    }

    // ---- item drops ----

    rollRarity(boss) {
        const w = this.spawner ? this.spawner.wave : 0;
        const wt = { common: 60, uncommon: 28, rare: w >= 3 ? 9 : 0, epic: w >= 8 ? 2.5 : 0, legendary: w >= 10 ? 0.6 : 0 };
        if (boss) {
            wt.common = 10; wt.uncommon = 25;
            wt.rare *= 4; wt.epic *= 4; wt.legendary *= 4;
        }
        const total = Object.values(wt).reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (const k of Object.keys(wt)) {
            r -= wt[k];
            if (r < 0) return k;
        }
        return 'common';
    }

    dropItem(x, y, boss) {
        const catalog = this.data.items || [];
        if (catalog.length === 0) return;
        const rarity = this.rollRarity(boss);
        const pool = catalog.filter((i) => i.rarity === rarity);
        if (pool.length === 0) return;
        const item = pool[Math.floor(Math.random() * pool.length)];
        this.pickups.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 8, item, age: 0 });
        if (rarity === 'epic' || rarity === 'legendary') this.showBanner(item.name + '!');
    }

    rollDrop(u) {
        if (!this.spawner || this.config.mode === 'tutorial' || !this.heroData) return;
        if (u.isBoss) {
            this.dropItem(u.x, u.y, true);
            if (Math.random() < 0.35) this.dropItem(u.x, u.y, true);
        } else if (Math.random() < DROP_CHANCE * (u.classType === 'giant' ? 1.5 : 1) * (this.dayNight ? this.dayNight.dropMult : 1)) {
            this.dropItem(u.x, u.y, false);
        }
    }

    updatePickups(dt) {
        for (const p of this.pickups) {
            p.age += dt;
            if (p.age > PICKUP_LIFE) { p.gone = true; continue; }
            for (const u of this.units) {
                if (u.alive && u.faction === 'player' && u.state !== 'falling' && Math.hypot(u.x - p.x, u.y - p.y) < 22) {
                    p.gone = true;
                    this.loot.push(p.item);
                    this.sfx.play('coin');
                    this.effects.floatText(p.x, p.y - 20, p.item.name, RARITY_COLORS[p.item.rarity]);
                    break;
                }
            }
        }
        this.pickups = this.pickups.filter((p) => !p.gone);
    }

    drawPickups(ctx) {
        for (const p of this.pickups) {
            if (p.age > PICKUP_LIFE - 8 && Math.floor(p.age * 4) % 2 === 0) continue;   // blink before it vanishes
            const s = this.camera.worldToScreen(p.x, p.y);
            if (s.x < -20 || s.x > VIEW_W + 20 || s.y < -20 || s.y > VIEW_H + 20) continue;
            const col = RARITY_COLORS[p.item.rarity];
            const bob = Math.sin(p.age * 4) * 2;
            const grad = ctx.createLinearGradient(0, s.y - 46, 0, s.y);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, col);
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = grad;
            ctx.fillRect(Math.round(s.x) - 2, s.y - 46, 4, 46);
            ctx.restore();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, 7, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            drawItemIcon(ctx, Math.round(s.x) - 7, Math.round(s.y - 18 + bob), 14, p.item.slot, p.item.rarity);
        }
    }

    // ---- healing ----

    maxHpOf(u) {
        return u.maxHp ?? u.maxHP ?? u.stats.hp;
    }

    healUnit(u, amount) {
        if (typeof u.hp !== 'number') { console.warn('Healer: unit has no hp field'); return 0; }
        const before = u.hp;
        u.hp = Math.min(this.maxHpOf(u), u.hp + amount);
        return u.hp - before;
    }

    // Most hurt friendly unit within range (the healer itself counts)
    findPatient(healer, range) {
        let best = null, bestRatio = 0.98;
        for (const u of this.units) {
            if (!u.alive || u.faction !== healer.faction || u.state === 'falling') continue;
            if (Math.hypot(u.x - healer.x, u.y - healer.y) > range) continue;
            const ratio = u.hp / this.maxHpOf(u);
            if (ratio < bestRatio) { best = u; bestRatio = ratio; }
        }
        return best;
    }

    castHeal(healer, patient) {
        const amount = healer.stats.damage;
        const done = this.healUnit(patient, amount);
        if (done > 0) this.effects.floatText(patient.x, patient.y - patient.radius * 2 - 6, '+' + Math.round(done), '#6fff9a');
        this.healEffect(healer, patient, true);
        if (healer.rank >= 2) {                     // Godly: heals nearby allies at half strength
            for (const o of this.units) {
                if (o === patient || !o.alive || o.faction !== healer.faction || o.state === 'falling') continue;
                if (Math.hypot(o.x - patient.x, o.y - patient.y) <= 56) {
                    this.healUnit(o, amount * 0.5);
                    this.healEffect(healer, o, false);
                }
            }
        }
    }

    healEffect(healer, target, withBeam) {
        target.healGlow = 0.45;
        if (withBeam) this.healFx.push({ type: 'beam', from: healer, to: target, t: 0, life: 0.45 });
        this.healFx.push({ type: 'ring', unit: target, t: 0, life: 0.6 });
        for (let i = 0; i < 4; i++) {
            this.healFx.push({ type: 'plus', unit: target, dx: (Math.random() - 0.5) * 20, t: -i * 0.07, life: 0.7 });
        }
    }

    drawHealFx(ctx) {
        ctx.save();
        for (const f of this.healFx) {
            if (f.t < 0) continue;
            const k = f.t / f.life;
            const a = 1 - k;
            if (f.type === 'beam') {
                const p = this.camera.worldToScreen(f.from.x, f.from.y - f.from.radius);
                const q = this.camera.worldToScreen(f.to.x, f.to.y - f.to.radius);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.strokeStyle = 'rgba(120, 255, 160, ' + (0.35 * a) + ')';
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.strokeStyle = 'rgba(210, 255, 225, ' + (0.9 * a) + ')';
                ctx.lineWidth = 1;
                ctx.stroke();
                const m = Math.min(1, k * 1.6);
                ctx.fillStyle = '#eaffef';
                ctx.fillRect(Math.round(p.x + (q.x - p.x) * m) - 1, Math.round(p.y + (q.y - p.y) * m) - 1, 3, 3);
            } else {
                const s = this.camera.worldToScreen(f.unit.x, f.unit.y);
                if (f.type === 'ring') {
                    const rx = 6 + 16 * k;
                    ctx.strokeStyle = 'rgba(120, 255, 160, ' + (0.9 * a) + ')';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.ellipse(s.x, s.y, rx, rx / 2, 0, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    const px = Math.round(s.x + f.dx), py = Math.round(s.y - 6 - 26 * k);
                    ctx.fillStyle = 'rgba(160, 255, 185, ' + a + ')';
                    ctx.fillRect(px - 1, py - 3, 2, 6);
                    ctx.fillRect(px - 3, py - 1, 6, 2);
                }
            }
        }
        ctx.restore();
    }

    // Centre of the fighting army (the healer follows it)
    armyCenter() {
        let n = 0, sx = 0, sy = 0;
        for (const u of this.units) {
            if (!u.alive || u.faction !== 'player' || u.state === 'falling') continue;
            if (u.classType === 'healer' || u.classType === 'miner') continue;
            sx += u.x; sy += u.y; n++;
        }
        return n ? { x: sx / n, y: sy / n } : null;
    }
    // ---- selection and orders ----

    setSelection(list) {
        for (const u of this.selected) u.selected = false;
        this.selected = new Set(list);
        for (const u of this.selected) u.selected = true;
    }

    pickUnit(wx, wy, faction) {
        let best = null, bd = Infinity;
        for (const u of this.units) {
            if (!u.alive || u.faction !== faction || u.state === 'falling') continue;
            const d = Math.hypot(u.x - wx, u.y - u.radius - wy);
            if (d <= u.radius + 6 && d < bd) { best = u; bd = d; }
        }
        return best;
    }

    clickSelect(wx, wy, shift) {
        const pick = this.pickUnit(wx, wy, 'player');
        if (!pick) {
            if (!shift) this.setSelection([]);
            return;
        }
        if (shift) {
            const s = new Set(this.selected);
            if (s.has(pick)) s.delete(pick); else s.add(pick);
            this.setSelection([...s]);
        } else {
            this.setSelection([pick]);
        }
    }

    boxSelect(x0, y0, x1, y1, shift) {
        const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
        const found = this.units.filter((u) => u.alive && u.faction === 'player' && u.canFight()
            && u.x >= minX && u.x <= maxX && u.y - u.radius >= minY && u.y - u.radius <= maxY);
        this.setSelection(shift ? [...this.selected, ...found] : found);
    }

    selectAllArmy() {
        this.setSelection(this.units.filter((u) => u.alive && u.faction === 'player' && u.canFight()));
    }

    issueOrder(wx, wy) {
        const sel = [...this.selected].filter((u) => u.alive);
        if (sel.length === 0) return;
        this.ordersIssued++;

        const enemy = this.pickUnit(wx, wy, 'mob');
        if (enemy) {
            sel.forEach((u) => { if (u.canFight()) { u.forcedTarget = enemy; u.moveOrder = null; } });
            this.effects.ping(enemy.x, enemy.y, '#ff5050');
            return;
        }

        const center = this.pathfinder.freePoint(wx, wy);
        const cols = Math.ceil(Math.sqrt(sel.length));
        const rows = Math.ceil(sel.length / cols);
        sel.forEach((u, i) => {
            const ox = ((i % cols) - (cols - 1) / 2) * 18;
            const oy = (Math.floor(i / cols) - (rows - 1) / 2) * 18;
            const p = this.pathfinder.freePoint(center.x + ox, center.y + oy);
            u.forcedTarget = null;
            u.target = null;
            u.moveOrder = { x: p.x, y: p.y };
            if (u.canFight()) u.stance = 'hold';
        });
        this.effects.ping(center.x, center.y);
    }

    setStance(stance) {
        const sel = [...this.selected].filter((u) => u.alive && u.canFight());
        if (sel.length > 0) {
            sel.forEach((u) => { u.stance = stance; });
        } else {
            this.defaultStance = stance;
            this.units.forEach((u) => { if (u.faction === 'player' && u.canFight()) u.stance = stance; });
        }
    }

    activeStance() {
        const sel = [...this.selected].filter((u) => u.canFight());
        if (sel.length === 0) return this.defaultStance;
        return sel.every((u) => u.stance === sel[0].stance) ? sel[0].stance : null;
    }

    handleEvent(e) {
        if (e.type === 'up' && this.ignoreUp) { this.ignoreUp = false; return; }
        if (e.type === 'down' && e.button === 0) {
            const hb = this.heroButtonAt(e.x, e.y);
            if (hb) { this.clickHeroButton(hb.slot); this.ignoreUp = true; return; }
            if (this.heroPanelContains(e.x, e.y)) { this.ignoreUp = true; return; }
        }
        if (this.heroAiming >= 0) {
            if (e.type === 'down') {
                if (e.button === 2) {
                    this.heroAiming = -1;
                } else if (e.button === 0) {
                    const overUi = this.minimap.contains(e.x, e.y) || this.summonBar.contains(e.x, e.y) || this.stanceBar.contains(e.x, e.y);
                    if (!overUi) { this.castHeroAt(this.heroAiming, e.x, e.y); this.heroAiming = -1; }
                }
                this.ignoreUp = true;
            }
            return;
        }
        if (e.type === 'down' && e.button === 0 && this.meteorButtonHit(e.x, e.y)) {
            this.toggleMeteorAim();
            this.ignoreUp = true;
            return;
        }
        if (e.type === 'down' && e.button === 0 && this.deleteButtonHit(e.x, e.y)) {
            this.requestDelete();
            this.ignoreUp = true;
            return;
        }
        if (this.meteorAiming) {
            if (e.type === 'down') {
                if (e.button === 2) {
                    this.meteorAiming = false;
                } else if (e.button === 0) {
                    const overUi = this.minimap.contains(e.x, e.y) || this.summonBar.contains(e.x, e.y) || this.stanceBar.contains(e.x, e.y);
                    if (!overUi) { this.castMeteorAt(e.x, e.y); this.meteorAiming = false; }
                }
                this.ignoreUp = true;
            }
            return;
        }
        const shift = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');

        if (e.type === 'down' && e.button === 0) {
            if (this.summonBar.click(e.x, e.y)) return;
            if (this.stanceBar.click(e.x, e.y)) return;
            if (this.minimap.contains(e.x, e.y)) {
                const p = this.minimap.toWorld(e.x, e.y);
                this.camera.centerOn(p.x, p.y);
                return;
            }
            const w = this.camera.screenToWorld(e.x, e.y);
            this.drag = { x0: w.x, y0: w.y, sx: e.x, sy: e.y };
        } else if (e.type === 'up' && e.button === 0 && this.drag) {
            const w = this.camera.screenToWorld(e.x, e.y);
            const moved = Math.hypot(e.x - this.drag.sx, e.y - this.drag.sy);
            if (moved > 6) this.boxSelect(this.drag.x0, this.drag.y0, w.x, w.y, shift);
            else this.clickSelect(w.x, w.y, shift);
            this.drag = null;
        } else if (e.type === 'down' && e.button === 2) {
            if (this.summonBar.contains(e.x, e.y) || this.stanceBar.contains(e.x, e.y) || this.heroPanelContains(e.x, e.y)) return;
            const w = this.minimap.contains(e.x, e.y)
                ? this.minimap.toWorld(e.x, e.y)
                : this.camera.screenToWorld(e.x, e.y);
            this.issueOrder(w.x, w.y);
        }
    }
        // ---- delete tool ----

    deleteCandidates() {
        return [...this.selected].filter((u) => u.alive && u.faction === 'player' && u.state !== 'falling' && !u.isHero);
    }

    deleteRect() {
        const m = this.meteorRect();
        return { x: m.x + m.w + 6, y: m.y, w: 92, h: m.h };
    }

    deleteButtonHit(px, py) {
        if (this.gameOver || this.deleteCandidates().length === 0) return false;
        const r = this.deleteRect();
        return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    }

    requestDelete() {
        if (this.gameOver) return;
        const list = this.deleteCandidates();
        if (list.length === 0) { this.showBanner('Select units to delete'); return; }
        if (this.deleteArm > 0 && this.deleteArmCount === list.length) {
            let refund = 0;
            for (const u of list) {
                refund += Math.floor(u.stats.cost * DELETE_REFUND);
                u.takeDamage(1e9);
            }
            this.unitsDeleted += list.length;
            this.deleteArm = 0;
            if (refund > 0) this.gold += refund;
            this.showBanner(list.length + ' removed');
            return;
        }
        this.deleteArm = 2.5;
        this.deleteArmCount = list.length;
        this.showBanner('Delete again to remove ' + list.length);
    }

    drawDeleteButton(ctx) {
        const n = this.deleteCandidates().length;
        if (this.gameOver || n === 0) return;
        const { x, y, w, h } = this.deleteRect();
        const armed = this.deleteArm > 0 && this.deleteArmCount === n;
        ctx.fillStyle = armed ? 'rgba(120, 20, 20, 0.95)' : 'rgba(15, 15, 35, 0.85)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = armed ? '#ff6060' : '#a05050';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = armed ? '#ffffff' : '#ff9090';
        ctx.fillText('Del Remove', x + 8, y + 13);
        ctx.fillStyle = armed ? '#ffd0d0' : '#cccccc';
        ctx.fillText(armed ? 'Click again' : n + ' selected', x + 8, y + 25);
    }
        // ---- Summon Fall meteor spell (unlocked in the skill tree) ----

    meteorRect() {
        return { x: 8, y: this.summonBar.top - 36, w: 112, h: 32 };
    }

    meteorButtonHit(px, py) {
        const r = this.meteorRect();
        return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    }

    toggleMeteorAim() {
        if (this.gameOver) return;
        if (this.meteorLevel <= 0) { this.showBanner('Unlock Summon Fall in the Skill Tree'); return; }
        if (this.meteorCooldown > 0) { this.showBanner('Meteor ready in ' + Math.ceil(this.meteorCooldown) + 's'); return; }
        this.heroAiming = -1;
        this.meteorAiming = !this.meteorAiming;
    }

    castMeteorAt(sx, sy) {
        if (this.meteorLevel <= 0 || this.meteorCooldown > 0) return false;
        const p = this.camera.screenToWorld(sx, sy);
        this.meteors.push({ x: p.x, y: p.y, t: 0, delay: 1.2, done: false });
        this.meteorCooldown = METEOR_COOLDOWN;
        this.sfx.play('boom');
        this.shake = 0.8;
        return true;
    }

    updateMeteors(dt) {
        if (this.meteorCooldown > 0) this.meteorCooldown = Math.max(0, this.meteorCooldown - dt);
        for (const mt of this.meteors) {
            mt.t += dt;
            if (mt.done || mt.t < mt.delay) continue;
            mt.done = true;
            const damage = METEOR_DAMAGE + METEOR_DAMAGE_PER_LEVEL * this.meteorLevel;
            for (const u of this.units) {
                if (u.alive && u.faction === 'mob' && Math.hypot(u.x - mt.x, u.y - mt.y) <= METEOR_RADIUS) {
                    this.dealDamage(u, damage);
                }
            }
            this.effects.puff(mt.x, mt.y);
            this.effects.spark(mt.x, mt.y - 6, '#ff9040');
        }
        // landed meteors stay a moment so the blast and scorch mark can fade out
        this.meteors = this.meteors.filter((mt) => mt.t < mt.delay + 2.5);
    }

    drawMeteorAim(ctx) {
        const m = this.input.mouse;
        if (!this.meteorAiming || this.gameOver || !m.inside) return;
        ctx.fillStyle = 'rgba(255, 120, 40, 0.12)';
        ctx.beginPath();
        ctx.arc(m.x, m.y, METEOR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 160, 80, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(m.x, m.y, METEOR_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffd0a0';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Click to cast - right-click or Esc to cancel', m.x, m.y - METEOR_RADIUS - 6);
    }

    drawMeteors(ctx) {
        this.drawMeteorAim(ctx);
        for (const mt of this.meteors) {
            const s = this.camera.worldToScreen(mt.x, mt.y);
            if (!mt.done) {
                const k = Math.min(1, mt.t / mt.delay);

                // shadow on the ground: grows and darkens as the meteor gets closer
                ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.15 + 0.4 * k) + ')';
                ctx.beginPath();
                ctx.arc(s.x, s.y, METEOR_RADIUS * (0.3 + 0.7 * k), 0, Math.PI * 2);
                ctx.fill();

                // outline of the area that will be hit
                ctx.strokeStyle = 'rgba(255, 120, 40, 0.9)';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.arc(s.x, s.y, METEOR_RADIUS, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // fireball falling in from the upper right, with a trail
                const fall = 1 - k;
                const fx = s.x + fall * 120, fy = s.y - fall * 230;
                for (let i = 6; i >= 1; i--) {
                    ctx.fillStyle = 'rgba(255, 140, 40, ' + (0.4 - i * 0.05) + ')';
                    ctx.beginPath();
                    ctx.arc(fx + i * 5, fy - i * 9, 9 - i, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#ff7a20';
                ctx.beginPath();
                ctx.arc(fx, fy, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffe080';
                ctx.beginPath();
                ctx.arc(fx - 2, fy - 2, 5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const age = mt.t - mt.delay;
                if (age < 0.35) {
                    ctx.fillStyle = 'rgba(255, 190, 80, ' + (0.6 * (1 - age / 0.35)) + ')';
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, METEOR_RADIUS * (0.4 + 0.6 * age / 0.35), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.35 * (1 - age / 2.5)) + ')';
                ctx.beginPath();
                ctx.arc(s.x, s.y, METEOR_RADIUS * 0.55, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    drawSoundHint(ctx) {
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('V Sound ' + (this.sfx.muted ? 'off' : 'on'), VIEW_W - 8, 72);
    }
    drawMeteorHud(ctx) {
        
        const locked = this.meteorLevel <= 0;
        const { x, y, w, h } = this.meteorRect();
        const ready = !locked && this.meteorCooldown <= 0;
        const frac = this.meteorCooldown / METEOR_COOLDOWN;

        ctx.fillStyle = 'rgba(15, 15, 35, 0.85)';
        ctx.fillRect(x, y, w, h);
        if (!locked && !ready) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.fillRect(x, y + h * (1 - frac), w, h * frac);
        }
        ctx.strokeStyle = this.meteorAiming ? '#ffffff' : (ready ? '#ffb070' : '#555');
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

        ctx.fillStyle = ready ? '#ff9040' : '#777';
        ctx.beginPath();
        ctx.arc(x + 14, y + h / 2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ready ? '#ffe080' : '#999';
        ctx.beginPath();
        ctx.arc(x + 12, y + h / 2 - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = ready ? '#ffb070' : '#aaa';
        ctx.fillText(locked ? 'E Meteor' : 'E Meteor Lv' + this.meteorLevel, x + 26, y + 13);
        ctx.fillStyle = ready ? '#6fff9a' : '#ccc';
        ctx.fillText(locked ? 'LOCKED' : (this.meteorAiming ? 'AIMING...' : (ready ? 'READY' : Math.ceil(this.meteorCooldown) + 's')), x + 26, y + 25);
    }
    // ---- update ----

    update(dt) {
        const events = this.input.takeEvents();
        if (this.gameOver && this.saveDone && this.input.wasPressed('KeyR')) location.reload();
        if (this.gameOver) this.updateGameOverInput(events);
        if (!this.gameOver && this.input.wasPressed('Space')) this.paused = !this.paused;
        if (this.paused && this.input.wasPressed('KeyF')) this.endRun('retired');

        if (!this.gameOver) {
            for (const e of events) this.handleEvent(e);
            for (let i = 0; i < this.summonBar.buttons.length; i++) {
            if (this.input.wasPressed(i < 9 ? 'Digit' + (i + 1) : 'Digit0')) this.summonBar.activate(i);
            }
            if (this.input.wasPressed('KeyZ')) this.setStance('attack');
            if (this.input.wasPressed('KeyX')) this.setStance('defend');
            if (this.input.wasPressed('KeyC')) this.setStance('hold');
            if (this.input.wasPressed('KeyQ')) this.selectAllArmy();
            if (this.input.wasPressed('KeyE')) this.toggleMeteorAim();
            HERO_KEYS.forEach((k, i) => { if (this.input.wasPressed(k)) this.hotkeyHero(i); });
            if (this.input.wasPressed('KeyV')) this.sfx.toggle();
            if (this.input.wasPressed('Delete') || this.input.wasPressed('Backspace')) this.requestDelete();
            if (this.input.wasPressed('Escape')) { this.meteorAiming = false; this.heroAiming = -1; this.setSelection([]); }
            if (this.config.debug) {
            if (this.input.wasPressed('KeyG')) { this.gold += 100; this.debugUsed = true; }
            if (this.input.wasPressed('KeyM')) { this.debugSpawnMob(); this.debugUsed = true; }
            if (this.input.wasPressed('KeyN')) { this.debugWave(); this.debugUsed = true; }
            }
        }
        this.updateCamera(dt);
        this.music.setPaused(this.paused);
        this.music.setMuted(this.sfx.muted);
        if (this.paused) return;

        this.effects.update(dt);
        if (this.deleteArm > 0) this.deleteArm = Math.max(0, this.deleteArm - dt);
        if (this.healFx.length) {
            for (const f of this.healFx) f.t += dt;
            this.healFx = this.healFx.filter((f) => f.t < f.life);
        }
        if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.5);
        if (this.banner) {
            this.banner.time -= dt;
            if (this.banner.time <= 0) this.banner = null;
        }
        if (this.gameOver) return;
        this.runTime += dt;
        this.updateMusic(dt);
        if (this.summonCooldown > 0) this.summonCooldown = Math.max(0, this.summonCooldown - dt);
        if (this.spawner) this.spawner.update(dt);
        if (this.dayNight) this.dayNight.update(dt);
        if (this.tutorial) this.tutorial.update(dt);
        this.updateMeteors(dt);
        this.updateHero(dt);
        this.updateHeroEffects(dt);
        this.updatePickups(dt);

        for (const u of this.units) {
            u.prevX = u.x;
            u.prevY = u.y;
            u.update(dt, this);
        }
        this.separate();
        for (const u of this.units) this.resolveTerrain(u);

        for (const p of this.projectiles) p.update(dt, this);
        this.projectiles = this.projectiles.filter((p) => p.alive);

        for (const u of this.units) if (!u.alive) this.onUnitDied(u);
        this.units = this.units.filter((u) => u.alive);
        for (const c of this.corpses) c.age += dt;
        this.corpses = this.corpses.filter((c) => c.age < 12 && !c.raised);
        if (!this.base.alive) this.endRun('destroyed');
    }
    // Keeps units out of blocked tiles. They slide along walls instead of freezing.
    resolveTerrain(u) {
        const blocked = (x, y) => this.map.isBlocked(Math.floor(x / TILE), Math.floor(y / TILE));
        if (!blocked(u.x, u.y)) return;
        if (!blocked(u.x, u.prevY)) { u.y = u.prevY; return; }   // keep the sideways move
        if (!blocked(u.prevX, u.y)) { u.x = u.prevX; return; }   // keep the up/down move
        if (!blocked(u.prevX, u.prevY)) { u.x = u.prevX; u.y = u.prevY; return; }
        const p = this.pathfinder.freePoint(u.x, u.y);           // stuck inside a wall: pop out
        u.x = p.x;
        u.y = p.y;
    }
    separate() {
        const u = this.units;
        for (let i = 0; i < u.length; i++) {
            for (let j = i + 1; j < u.length; j++) {
                const a = u[i], b = u[j];
                if (a.state === 'falling' || b.state === 'falling') continue;
                let dx = b.x - a.x, dy = b.y - a.y;
                let d = Math.hypot(dx, dy);
                const min = a.radius + b.radius;
                if (d >= min) continue;
                if (d === 0) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy) || 1; }
                const push = (min - d) / 2 / d;
                if (a.state !== 'mining') { a.x -= dx * push; a.y -= dy * push; }
                if (b.state !== 'mining') { b.x += dx * push; b.y += dy * push; }
            }
        }
    }

    updateCamera(dt) {
        const k = this.input;
        let dx = 0, dy = 0;
        if (k.isDown('KeyA') || k.isDown('ArrowLeft')) dx -= 1;
        if (k.isDown('KeyD') || k.isDown('ArrowRight')) dx += 1;
        if (k.isDown('KeyW') || k.isDown('ArrowUp')) dy -= 1;
        if (k.isDown('KeyS') || k.isDown('ArrowDown')) dy += 1;

        const m = k.mouse;
        const overUi = this.minimap.contains(m.x, m.y) || this.summonBar.contains(m.x, m.y) || this.stanceBar.contains(m.x, m.y) || this.heroPanelContains(m.x, m.y);
        if (m.inside && !overUi && !this.drag) {
            if (m.x < EDGE_SIZE) dx -= 1;
            else if (m.x > VIEW_W - EDGE_SIZE) dx += 1;
            if (m.y < EDGE_SIZE) dy -= 1;
            else if (m.y > VIEW_H - EDGE_SIZE) dy += 1;
        }
        this.camera.move(dx * PAN_SPEED * dt, dy * PAN_SPEED * dt);
    }

    // ---- render ----

    render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        const shaking = this.shake > 0;
        if (shaking) {
            ctx.save();
            ctx.translate(Math.round((Math.random() - 0.5) * this.shake * 8), Math.round((Math.random() - 0.5) * this.shake * 8));
        }

        this.map.draw(ctx, this.camera);
        this.mines.forEach((m) => m.draw(ctx, this.camera));
        this.base.draw(ctx, this.camera);

        [...this.units].sort((a, b) => a.y - b.y).forEach((u) => u.draw(ctx, this.camera));
        this.drawPickups(ctx);
        this.projectiles.forEach((p) => p.draw(ctx, this.camera));
        this.effects.draw(ctx, this.camera);
        this.drawHeroEffects(ctx);
        this.drawHealFx(ctx);
        this.drawMeteors(ctx);
        this.drawDragBox(ctx);
        if (this.dayNight) this.dayNight.draw(ctx);
        ctx.drawImage(getArt().vignette, 0, 0);
        this.minimap.draw(ctx);
        this.units.forEach((u) => this.minimap.dotWorld(ctx, u.x, u.y, u.faction === 'player' ? '#ffffff' : '#ff3030'));
        this.drawThreatArrows(ctx);
        this.summonBar.draw(ctx);
        this.stanceBar.draw(ctx);
        this.drawMeteorHud(ctx);
        this.drawHeroPanel(ctx);
        this.drawDeleteButton(ctx);
        this.summonBar.drawTooltip(ctx);
        this.drawSoundHint(ctx);
        this.drawHud(ctx);
        this.drawBossBar(ctx);
        this.drawBanner(ctx);
        if (this.tutorial) this.tutorial.draw(ctx);
        this.drawOverlay(ctx);
        if (shaking) ctx.restore();
    }

    drawDragBox(ctx) {
        const m = this.input.mouse;
        if (!this.drag || Math.hypot(m.x - this.drag.sx, m.y - this.drag.sy) <= 6) return;
        const s = this.camera.worldToScreen(this.drag.x0, this.drag.y0);
        const x = Math.min(s.x, m.x), y = Math.min(s.y, m.y);
        const w = Math.abs(m.x - s.x), h = Math.abs(m.y - s.y);
        ctx.fillStyle = 'rgba(111, 255, 111, 0.12)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#6fff6f';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
    }

    drawHud(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(4, 4, 150, 54);
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath();
        ctx.arc(14, 15, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(String(this.gold), 24, 19);
        const army = this.units.filter((u) => u.faction === 'player').length;
        ctx.fillText('Army ' + army, 84, 19);
        this.base.drawHpBar(ctx, 79, 30, 140, true);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#c080ff';
        ctx.fillText('Souls ' + this.souls, 10, 52);
        ctx.fillStyle = '#fff';
        ctx.fillText('Kills ' + this.kills, 84, 52);
        if (this.loot.length > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(4, 60, 62, 14);
            ctx.fillStyle = '#ffa020';
            ctx.fillText('Loot ' + this.loot.length, 10, 71);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(VIEW_W - 100, 4, 96, this.spawner ? 70 : 22);
        ctx.fillStyle = '#fff';
        ctx.fillText('FPS ' + Math.round(this.fps), VIEW_W - 94, 18);
        if (this.spawner) {
            ctx.fillText('Wave ' + this.spawner.wave, VIEW_W - 94, 32);
            ctx.fillText('Next ' + this.spawner.secondsToNext + 's', VIEW_W - 94, 46);
            ctx.fillStyle = '#ffd84a';
            ctx.fillText('Score ' + this.score, VIEW_W - 94, 58);
            if (this.dayNight) {
                ctx.fillStyle = this.dayNight.dark > 0.5 ? '#9fb4ff' : '#ffe27a';
                ctx.fillText(this.dayNight.label, VIEW_W - 94, 70);
            }
        }
    }

    drawBanner(ctx) {
        if (!this.banner) return;
        ctx.globalAlpha = Math.min(1, this.banner.time);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '24px monospace';
        ctx.fillText(this.banner.text, VIEW_W / 2, 80);
        ctx.globalAlpha = 1;
    }

    drawOverlay(ctx) {
        if (!this.gameOver && !this.paused) return;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        if (this.gameOver) { this.drawGameOver(ctx); return; }
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '28px monospace';
        ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 6);
        ctx.font = '12px monospace';
        ctx.fillText(this.spawner ? 'Space: resume   F: end run and save' : 'Space: resume', VIEW_W / 2, VIEW_H / 2 + 18);
    }

    // ---- game over screen ----

    gameOverButtons() {
        const w = 112, h = 28, gap = 10;
        const x0 = Math.round((VIEW_W - (3 * w + 2 * gap)) / 2);
        const y = 268;
        return [
            { label: '1 Play again', act: 'again', x: x0, y, w, h },
            { label: '2 Skill Tree', act: 'skills', x: x0 + w + gap, y, w, h },
            { label: '3 Menu', act: 'menu', x: x0 + 2 * (w + gap), y, w, h },
        ];
    }

    gameOverAction(act) {
        if (act === 'again') location.reload();
        else if (act === 'skills') location.href = this.config.baseUrl + '/views/skills.php';
        else if (act === 'menu') location.href = this.config.baseUrl + '/views/menu.php';
    }

    updateGameOverInput(events) {
        const go = (act) => { if (this.saveDone) this.gameOverAction(act); };
        for (const e of events) {
            if (e.type !== 'down' || e.button !== 0) continue;
            const b = this.gameOverButtons().find((x) => e.x >= x.x && e.x <= x.x + x.w && e.y >= x.y && e.y <= x.y + x.h);
            if (b) go(b.act);
        }
        if (this.input.wasPressed('Digit1')) go('again');
        if (this.input.wasPressed('Digit2')) go('skills');
        if (this.input.wasPressed('Digit3') || this.input.wasPressed('KeyM')) go('menu');
    }

    formatTime(sec) {
        const s = Math.floor(sec);
        return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }

    drawGameOver(ctx) {
        const px = 110, py = 40, pw = VIEW_W - 220, ph = 272;
        ctx.fillStyle = 'rgba(12, 10, 28, 0.94)';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#ffcf5a';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

        ctx.textAlign = 'center';
        ctx.font = '24px monospace';
        ctx.fillStyle = this.endReason === 'destroyed' ? '#ff6b6b' : '#ffd84a';
        ctx.fillText(this.endReason === 'destroyed' ? 'STATUE DESTROYED' : 'RUN ENDED', VIEW_W / 2, py + 40);

        const wave = this.spawner ? this.spawner.wave : 0;
        const rows = [
            ['Map', this.map.def.name],
            ['Score', String(this.score)],
            ['Wave reached', String(wave)],
            ['Kills', String(this.kills)],
            ['Souls earned', String(this.souls)],
            ['Time survived', this.formatTime(this.runTime)],
        ];
        ctx.font = '13px monospace';
        rows.forEach((r, i) => {
            const y = py + 68 + i * 19;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#aab';
            ctx.fillText(r[0], px + 36, y);
            ctx.textAlign = 'right';
            ctx.fillStyle = r[0] === 'Score' ? '#ffd84a' : '#fff';
            ctx.fillText(r[1], px + pw - 36, y);
        });

        ctx.textAlign = 'center';
        ctx.font = '12px monospace';
        ctx.fillStyle = '#ffd84a';
        if (this.heroData) {
            ctx.font = '11px monospace';
            ctx.fillStyle = '#aab';
            ctx.fillText(this.loot.length ? 'Loot found (' + this.loot.length + ')' : 'No loot this run', VIEW_W / 2, py + 68 + rows.length * 19 + 4);
            const shown = this.loot.slice(0, 16);
            const iw = 16, gap = 3;
            const x0 = Math.round(VIEW_W / 2 - (shown.length * (iw + gap) - gap) / 2);
            shown.forEach((it, i) => drawItemIcon(ctx, x0 + i * (iw + gap), py + 68 + rows.length * 19 + 9, iw, it.slot, it.rarity));
        }
        ctx.font = '12px monospace';
        ctx.fillStyle = '#ffd84a';
        ctx.fillText(this.runMessage, VIEW_W / 2, py + 222);

        const m = this.input.mouse;
        for (const b of this.gameOverButtons()) {
            const hover = this.saveDone && m.inside && m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h;
            ctx.fillStyle = !this.saveDone ? '#2a2a3a' : (hover ? '#ffcf5a' : '#26264a');
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = this.saveDone ? '#ffcf5a' : '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
            ctx.fillStyle = !this.saveDone ? '#777' : (hover ? '#1a1424' : '#ffffff');
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(b.label, b.x + b.w / 2, b.y + 18);
        }
    }

    // ---- boss bar, enemy arrows, music intensity ----

    drawBossBar(ctx) {
        if (this.gameOver) return;
        const boss = this.units.find((u) => u.alive && u.isBoss);
        if (!boss) return;
        const w = 240, h = 10, x = (VIEW_W - w) / 2, y = 40;
        const ratio = Math.max(0, Math.min(1, boss.hp / this.maxHpOf(boss)));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 4, y - 16, w + 8, h + 22);
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WAVE ' + (this.spawner ? this.spawner.wave : '') + ' BOSS - ' + String(boss.name).toUpperCase(), VIEW_W / 2, y - 4);
        ctx.fillStyle = '#3a1010';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#e03030';
        ctx.fillRect(x, y, Math.round(w * ratio), h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(x, y, Math.round(w * ratio), 2);
        ctx.strokeStyle = '#ffcf5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    // Red arrows on the screen edge that point at enemies you cannot see (a gold one for the boss)
    drawThreatArrows(ctx) {
        if (this.gameOver) return;
        const cx = VIEW_W / 2, cy = VIEW_H / 2, SECTORS = 16;
        const count = new Array(SECTORS).fill(0);
        const bossIn = new Array(SECTORS).fill(false);
        for (const u of this.units) {
            if (!u.alive || u.faction !== 'mob') continue;
            const s = this.camera.worldToScreen(u.x, u.y);
            if (s.x > -8 && s.x < VIEW_W + 8 && s.y > -8 && s.y < VIEW_H + 8) continue;   // already on screen
            const a = Math.atan2(s.y - cy, s.x - cx);
            const i = Math.floor(((a + Math.PI) / (Math.PI * 2)) * SECTORS) % SECTORS;
            count[i]++;
            if (u.isBoss) bossIn[i] = true;
        }
        const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 220);
        for (let i = 0; i < SECTORS; i++) {
            if (!count[i]) continue;
            const a = ((i + 0.5) / SECTORS) * Math.PI * 2 - Math.PI;
            const dx = Math.cos(a), dy = Math.sin(a);
            const tx = Math.abs(dx) > 0.001 ? (cx - 16) / Math.abs(dx) : Infinity;
            const ty = Math.abs(dy) > 0.001 ? (cy - 16) / Math.abs(dy) : Infinity;
            const t = Math.min(tx, ty);
            const x = cx + dx * t;
            const y = Math.min(cy + dy * t, VIEW_H - 108);     // stay clear of the bars at the bottom
            const size = bossIn[i] ? 11 : 7 + Math.min(4, count[i] / 3);
            ctx.save();
            ctx.translate(Math.round(x), Math.round(y));
            ctx.rotate(a);
            ctx.globalAlpha = pulse;
            ctx.fillStyle = bossIn[i] ? '#ffcf5a' : '#ff4a4a';
            ctx.strokeStyle = '#2a0a0a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.lineTo(-size * 0.6, -size * 0.8);
            ctx.lineTo(-size * 0.3, 0);
            ctx.lineTo(-size * 0.6, size * 0.8);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
            ctx.restore();
            if (count[i] > 1) {
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(String(count[i]), x - dx * 18, y - dy * 18 + 3);
            }
        }
    }

    // The battle layer of the music fades in with the number of enemies alive
    updateMusic(dt) {
        this.musicTimer -= dt;
        if (this.musicTimer > 0) return;
        this.musicTimer = 0.5;
        let mobs = 0, boss = false;
        for (const u of this.units) {
            if (u.alive && u.faction === 'mob') { mobs++; if (u.isBoss) boss = true; }
        }
        this.music.setIntensity(boss ? 1 : Math.min(1, mobs / 10));
    }
}