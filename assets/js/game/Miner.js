import { Unit } from './Unit.js';

const MINE_TIME = 2;      // seconds spent mining
const CARRY = 15;         // gold carried per trip
const ARRIVE_RADIUS = 24; // close enough counts as arrived (lets several miners share a spot)

export class Miner extends Unit {
    constructor(stats, faction, x, y) {
        super(stats, faction, x, y);
        this.task = 'toMine';
        this.timer = 0;
        this.carrying = 0;
        this.mine = null;
    }

    canFight() { return false; }

    isNear(x, y) {
        return Math.hypot(this.x - x, this.y - y) <= ARRIVE_RADIUS;
    }

    update(dt, game) {
        super.update(dt, game);
        if (this.state === 'falling') return;
        if (this.followMoveOrder(dt)) return;

        if (this.task === 'toMine') {
            if (!this.mine || this.mine.gold <= 0) this.mine = game.nearestMine(this.x, this.y);
            if (!this.mine) { this.state = 'idle'; return; }
            if (this.isNear(this.mine.workX, this.mine.workY)) {
                this.task = 'mining';
                this.state = 'mining';
                this.timer = MINE_TIME;
            } else {
                this.state = 'moving';
                this.moveToward(this.mine.workX, this.mine.workY, dt);
            }
        } else if (this.task === 'mining') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.carrying = this.mine.take(CARRY);
                this.task = this.carrying > 0 ? 'toBase' : 'toMine';
            }
        } else if (this.task === 'toBase') {
            if (this.isNear(game.base.workX, game.base.workY)) {
                game.addGold(this.carrying, this.x, this.y);
                this.carrying = 0;
                this.task = 'toMine';
            } else {
                this.state = 'moving';
                this.moveToward(game.base.workX, game.base.workY, dt);
            }
        }
    }

    drawExtras(ctx, x, y) {
        if (this.carrying > 0) {
            ctx.fillStyle = '#ffd84a';
            ctx.fillRect(Math.round(x) - 3, Math.round(y - (this.animator ? this.animator.height : 2 * this.radius)) - 5, 6, 5);
        }
    }
}