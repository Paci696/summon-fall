import { Unit } from './Unit.js';

const FIRST_DELAY = 20;     // seconds before wave 1
const WAVE_INTERVAL = 40;   // seconds between waves
const EARLY_DELAY = 5;      // when the field is clear, the next wave comes sooner
const SPAWN_GAP = 0.5;      // seconds between mobs of one wave
const MAX_PER_WAVE = 60;
const TIER_EVERY = 10; // a new tier every 10 waves, forever

export function tierOf(wave) {
    return Math.floor(wave / TIER_EVERY);
}

function tierBonus(tier) {
    return {
        hp: 1 + 0.4 * tier + 0.05 * tier * tier,
        damage: 1 + 0.22 * tier + 0.01 * tier * tier,
        speed: Math.min(1.5, 1 + 0.05 * tier), // capped so they never outrun your army
    };
}

// How dangerous a mob is, from its stats
export function threatOf(row) {
    return Math.max(1, row.hp / 40 + row.damage / 6);
}

export class WaveSpawner {
    constructor(game) {
        this.game = game;
        this.wave = 0;
        this.timer = FIRST_DELAY;
        this.queue = [];
        this.spawnTimer = 0;
    }

    get secondsToNext() {
        return Math.max(0, Math.ceil(this.timer));
    }

    update(dt) {
        if (this.queue.length > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnNext();
                this.spawnTimer = SPAWN_GAP;
            }
        }

        this.updateBone(dt);

        this.timer -= dt;
        const fieldClear = this.queue.length === 0
            && !this.game.units.some((u) => u.faction === 'mob' && u.alive);
        if (this.wave > 0 && fieldClear && this.timer > EARLY_DELAY) this.timer = EARLY_DELAY;
        if (this.timer <= 0) this.startWave();
    }

    // The Bone Colossus rattles its ribs and calls two zombies every 14 seconds
    updateBone(dt) {
        const boss = this.game.units.find((u) => u.alive && u.isBone);
        if (!boss) return;
        boss.rattleT -= dt;
        if (boss.rattleT > 0) return;
        boss.rattleT = 14;
        const row = this.game.data.mobs.find((m) => m.class_type === 'zombie');
        if (!row) return;
        for (let i = 0; i < 2; i++) {
            const p = this.game.pathfinder.freePoint(boss.x + (Math.random() - 0.5) * 70, boss.y + (Math.random() - 0.5) * 70);
            this.spawnAt(row, p.x, p.y, {});
        }
        this.game.showBanner('The Colossus calls the dead!');
    }

    startWave() {
        this.wave++;
        this.timer = WAVE_INTERVAL;
        const scale = 1 + (this.wave - 1) * 0.08;
        const night = !!(this.game.dayNight && this.game.dayNight.isNight);
        // zombies only crawl out of trees at night (DayNight.js); ghouls only join night waves
        const pool = this.game.data.mobs.filter((m) => m.first_wave <= this.wave
            && m.class_type !== 'zombie' && (m.class_type !== 'ghoul' || night));

        let budget = 4 + this.wave * 3;
        const list = [];
        while (list.length < MAX_PER_WAVE) {
            const options = pool.filter((m) => threatOf(m) <= budget);
            if (options.length === 0) break;
            const row = this.pickWeighted(options);
            budget -= threatOf(row);
            list.push(row);
        }

        const nests = [...this.game.nests].sort(() => Math.random() - 0.5).slice(0, 2);
        const tier = tierOf(this.wave);
        this.queue = list.map((row) => ({ row, scale, tier, nest: nests[Math.floor(Math.random() * nests.length)] }));
        if (this.wave % 10 === 0) {
            const giant = this.game.data.mobs.find((m) => m.class_type === 'giant');
            const bone = (this.wave / 10) % 2 === 0;      // boss waves alternate: Warlord, Bone Colossus, Warlord...
            if (giant) this.queue.push({ row: giant, scale, tier, nest: nests[0], boss: true, bone });
        }
        this.spawnTimer = 0;
        this.game.showBanner(tier > tierOf(this.wave - 1)
            ? 'Wave ' + this.wave + ' - The monsters grow stronger!'
            : 'Wave ' + this.wave);
        if (this.wave % 10 === 0) this.game.showBanner('Wave ' + this.wave + ' - BOSS!');
        
        
    }
    

    pickWeighted(options) {
        const total = options.reduce((sum, m) => sum + m.spawn_weight, 0);
        let roll = Math.random() * total;
        for (const m of options) {
            roll -= m.spawn_weight;
            if (roll <= 0) return m;
        }
        return options[options.length - 1];
    }

    spawnNext() {
        const { row, scale, tier, nest, boss, bone } = this.queue.shift();
        const p = this.game.pathfinder.freePoint(nest.x + (Math.random() - 0.5) * 80, nest.y + (Math.random() - 0.5) * 80);
        this.spawnAt(row, p.x, p.y, { scale, tier, boss, bone });
    }

    // Creates one scaled mob at a point. Used for nest waves, night zombies and the Bone Colossus' minions.
    spawnAt(row, x, y, opts = {}) {
        const wave = Math.max(1, this.wave);
        const scale = opts.scale ?? (1 + (wave - 1) * 0.08);
        const tier = opts.tier ?? tierOf(wave);
        const { boss, bone } = opts;
        const b = tierBonus(tier);
        const stats = {
            ...row,
            hp: Math.round(row.hp * scale * b.hp * (boss ? (bone ? 4.5 : 5) : 1)),
            damage: Math.round(row.damage * scale * b.damage * (boss ? (bone ? 1.4 : 1.6) : 1)),
            speed: Math.round(row.speed * b.speed * (boss ? (bone ? 0.9 : 0.85) : 1)),
        };
        if (boss) {
            stats.name = bone ? 'Bone Colossus' : 'Warlord';
            stats.sprite_key = bone ? 'boss_bone' : 'boss';
        }
        const unit = new Unit(stats, 'mob', x, y);
        unit.threat = threatOf(row);
        unit.tier = tier;
        if (boss) { unit.isBoss = true; unit.radius = 22; unit.isBone = !!bone; unit.rattleT = 12; }
        this.game.addUnit(unit);
        return unit;
    }
}