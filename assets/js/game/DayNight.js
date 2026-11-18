// DayNight.js - the day/night clock, the dark overlay and the night zombies that crawl out of the trees.
import { VIEW_W, VIEW_H } from './Game.js';
import { TILE, TileType } from './GameMap.js';

const DAY = 120;        // seconds of full daylight //120 default
const DUSK = 15;        // fade into night
const NIGHT = 60;       // full night
const DAWN = 15;        // fade back to day
const CYCLE = DAY + DUSK + NIGHT + DAWN;

export class DayNight {
    constructor(game) {
        this.game = game;
        this.t = 0;                 // seconds into the current cycle
        this.days = 1;
        this.wasNight = false;
        this.zombieTimer = 3;
        this.dark = 0;              // 0 = day, 1 = night
        this.layer = document.createElement('canvas');
        this.layer.width = VIEW_W;
        this.layer.height = VIEW_H;
        this.treeSpots = null;      // tree tiles a night zombie may crawl out of (found once)
    }

    get isNight() { return this.dark >= 0.85; }
    get isDay() { return this.dark <= 0.15; }
    get soulMult() { return this.isNight ? 2 : 1; }          // night: double souls
    get dropMult() { return this.isNight ? 1.5 : 1; }        // night: more item drops

    // seconds left until the phase flips between day and night (for the HUD clock)
    get label() {
        if (this.t < DAY) return 'DAY ' + this.days;
        if (this.t < DAY + DUSK) return 'DUSK';
        if (this.t < DAY + DUSK + NIGHT) return 'NIGHT ' + this.days;
        return 'DAWN';
    }

    update(dt) {
        this.t += dt;
        if (this.t >= CYCLE) { this.t -= CYCLE; this.days++; }
        const t = this.t;
        if (t < DAY) this.dark = 0;
        else if (t < DAY + DUSK) this.dark = (t - DAY) / DUSK;
        else if (t < DAY + DUSK + NIGHT) this.dark = 1;
        else this.dark = 1 - (t - DAY - DUSK - NIGHT) / DAWN;

        const g = this.game;
        const night = t >= DAY + DUSK * 0.5 && t < DAY + DUSK + NIGHT;     // zombies start crawling during dusk
        if (night && !this.wasNight) g.showBanner('Night falls... the dead crawl out of the trees!');
        if (!night && this.wasNight) { g.showBanner('Dawn! The undead burn in the sun.'); this.burnNightborn(); }
        this.wasNight = night;

        // day: miners work faster
        const minerSpeed = this.isDay ? 1.2 : 1;
        for (const u of g.units) if (u.alive && u.classType === 'miner') u.speed = u.stats.speed * minerSpeed;

        if (night) this.spawnZombies(dt);
    }

    findTreeSpots() {
        const map = this.game.map, b = map.playerBase, out = [];
        for (let ty = 2; ty < map.rows - 2; ty++) {
            for (let tx = 2; tx < map.cols - 2; tx++) {
                if (map.tiles[ty][tx] !== TileType.TREE) continue;
                const d = Math.hypot(tx - b.tx, ty - b.ty);
                if (d > 14 && d < 34) out.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
            }
        }
        return out;
    }

    spawnZombies(dt) {
        const g = this.game, sp = g.spawner;
        if (!sp || sp.wave < 1) return;
        const row = g.data.mobs.find((m) => m.class_type === 'zombie');
        if (!row) return;
        this.zombieTimer -= dt;
        if (this.zombieTimer > 0) return;
        this.zombieTimer = Math.max(1.2, 4.5 - sp.wave * 0.1);

        const cap = Math.min(24, 4 + sp.wave);
        let alive = 0;
        for (const u of g.units) if (u.alive && u.nightBorn) alive++;
        if (alive >= cap) return;

        if (!this.treeSpots) this.treeSpots = this.findTreeSpots();
        if (this.treeSpots.length === 0) return;
        const s = this.treeSpots[Math.floor(Math.random() * this.treeSpots.length)];
        const p = g.pathfinder.freePoint(s.x, s.y);
        const z = sp.spawnAt(row, p.x, p.y, {});
        z.nightBorn = true;
        g.effects.puff(p.x, p.y);
    }

    // sunlight kills every zombie that crawled out at night (no loot, no kill credit)
    burnNightborn() {
        for (const u of this.game.units) {
            if (u.alive && u.nightBorn) { u.burned = true; u.lifespan = 0.5 + Math.random() * 6; }
        }
    }

    // dark blue layer with warm light holes around the statue and your hero
    draw(ctx) {
        if (this.dark <= 0.01) return;
        const g = this.game, c = this.layer.getContext('2d');
        c.globalCompositeOperation = 'source-over';
        c.clearRect(0, 0, VIEW_W, VIEW_H);
        c.fillStyle = 'rgba(8, 14, 52, ' + (0.62 * this.dark) + ')';
        c.fillRect(0, 0, VIEW_W, VIEW_H);
        c.globalCompositeOperation = 'destination-out';
        const light = (wx, wy, r) => {
            const s = g.camera.worldToScreen(wx, wy);
            if (s.x < -r || s.x > VIEW_W + r || s.y < -r || s.y > VIEW_H + r) return;
            const grad = c.createRadialGradient(s.x, s.y, r * 0.15, s.x, s.y, r);
            grad.addColorStop(0, 'rgba(0,0,0,' + (0.95 * this.dark) + ')');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = grad;
            c.fillRect(s.x - r, s.y - r, r * 2, r * 2);
        };
        light(g.base.x, g.base.y, 150);
        if (g.heroUnit && g.heroUnit.alive) light(g.heroUnit.x, g.heroUnit.y, 80);
        for (const u of g.units) if (u.alive && u.isUndead) light(u.x, u.y, 28);
        ctx.drawImage(this.layer, 0, 0);
    }
}