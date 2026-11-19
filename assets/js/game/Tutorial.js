import { Unit } from './Unit.js';

const FINISH_LINES = [
    'Nice work! Spend souls in the Skill Tree, level up your',
    'hero and survive the waves in Endless mode.',
    'Press Enter to return to the menu.',
];

export class Tutorial {
    constructor(game) {
        this.game = game;
        this.index = 0;
        this.entered = false;
        this.flash = 0;
        this.startX = game.camera.x;
        this.startY = game.camera.y;

        this.steps = [
            {
                lines: ['Welcome to Summon Fall! First, scroll the map:',
                        'WASD, arrow keys, or push the mouse to a screen edge.'],
                check: (g) => Math.hypot(g.camera.x - this.startX, g.camera.y - this.startY) > 220,
            },
            {
                lines: ['Summon a Miner: click its button (bottom-left)',
                        'or press 1. Miners dig gold for you automatically.'],
                onStart: (g) => { if (g.gold < 50) g.gold = 50; },
                check: (g) => g.units.some((u) => u.alive && u.classType === 'miner'),
            },
            {
                lines: ['Your Miner walks to the mine and carries gold',
                        'back to the statue. Wait for the first delivery.'],
                check: (g) => g.totalGold > 0,
            },
            {
                lines: ['Now summon a Swordsman with the button or press 2.',
                        'He falls from the sky and guards your statue.'],
                onStart: (g) => { if (g.gold < 100) g.gold = 100; },
                check: (g) => g.units.some((u) => u.alive && u.classType === 'swordsman'),
            },
            {
                lines: ['Select him: click him, drag a box around him,',
                        'or press Q to select your whole army.'],
                check: (g) => [...g.selected].some((u) => u.alive && u.canFight()),
            },
            {
                lines: ['Right-click the ground to order him to move there.',
                        '(A moved unit holds position until you change it.)'],
                check: (g) => g.ordersIssued > 0,
            },
            {
                lines: ['Stances: Z = Attack, X = Defend, C = Hold.',
                        'Press X to send the army back to defend the statue.'],
                check: (g) => {
                    const army = g.units.filter((u) => u.alive && u.canFight());
                    return army.length > 0 && army.every((u) => u.stance === 'defend');
                },
            },
            {
                lines: ['A Slime attacks! Defeat it. Tip: right-click an',
                        'enemy to make selected units focus it.'],
                onStart: (g) => this.spawnSlime(g),
                check: (g) => g.kills >= 1,
            },
            {
                lines: ['This is your HERO (gold ring). It fights for free and',
                        'has 3 skills: R, T and Y. Cast one now!'],
                check: (g) => !g.heroUnit || g.heroUnit.cd.some((c) => c > 0),
            },
            {
                lines: ['Look at the bar at the top: your hero LEVEL (max 100).',
                        'Every run earns XP. Higher level = more HP and damage.',
                        'Press Enter to continue.'],
                check: (g) => g.input.wasPressed('Enter'),
            },
            {
                lines: ['In the Skill Tree, unlock ELITE and GODLY versions of',
                        'each unit, then pick them in Loadout. They look and',
                        'fight better. Press Enter to continue.'],
                check: (g) => g.input.wasPressed('Enter'),
            },
        ];
    }

    get done() {
        return this.index >= this.steps.length;
    }

    spawnSlime(g) {
        const row = g.data.mobs.find((m) => m.class_type === 'slime') || g.data.mobs[0];
        if (!row) return;
        const p = g.pathfinder.freePoint(g.base.x + 320, g.base.y - 40);
        g.addUnit(new Unit(row, 'mob', p.x, p.y));
    }

    update(dt) {
        const g = this.game;
        if (this.flash > 0) this.flash -= dt;

        if (this.done) {
            if (g.input.wasPressed('Enter')) window.location.href = g.config.baseUrl + '/views/menu.php';
            return;
        }
        const step = this.steps[this.index];
        if (!this.entered) {
            if (step.onStart) step.onStart(g);
            this.entered = true;
        }
        if (step.check(g)) {
            this.index++;
            this.entered = false;
            this.flash = 1.2;
        }
    }

    draw(ctx) {
        const lines = this.done ? FINISH_LINES : this.steps[this.index].lines;
        const w = 420, x = Math.round((ctx.canvas.width - w) / 2), y = 66, h = 22 + lines.length * 14;   // centred for the 960 view

        ctx.fillStyle = 'rgba(15, 15, 35, 0.92)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ffcf5a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

        ctx.textAlign = 'left';
        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffcf5a';
        ctx.fillText(this.done ? 'TUTORIAL COMPLETE' : 'TUTORIAL ' + (this.index + 1) + '/' + this.steps.length, x + 8, y + 13);

        ctx.fillStyle = '#fff';
        ctx.font = '11px monospace';
        lines.forEach((line, i) => ctx.fillText(line, x + 8, y + 28 + i * 14));

        if (this.flash > 0) {
            ctx.fillStyle = '#6fff9a';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('Done!', x + w - 8, y + 13);
        }
    }
}