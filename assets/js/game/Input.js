export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = new Set();
        this.pressedKeys = new Set();
        this.events = [];
        this.mouse = { x: 0, y: 0, inside: false, left: false, right: false };

        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
            if (!e.repeat) this.pressedKeys.add(e.code);
            this.keys.add(e.code);
        });
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));

        window.addEventListener('mousemove', (e) => Object.assign(this.mouse, this.toCanvas(e)));
        canvas.addEventListener('mousemove', () => { this.mouse.inside = true; });
        canvas.addEventListener('mouseleave', () => { this.mouse.inside = false; });

        canvas.addEventListener('mousedown', (e) => {
            this.setButton(e.button, true);
            this.events.push({ type: 'down', button: e.button, ...this.toCanvas(e) });
        });
        window.addEventListener('mouseup', (e) => {
            this.setButton(e.button, false);
            this.events.push({ type: 'up', button: e.button, ...this.toCanvas(e) });
        });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    toCanvas(e) {
        const r = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (this.canvas.width / r.width),
            y: (e.clientY - r.top) * (this.canvas.height / r.height),
        };
    }

    setButton(button, value) {
        if (button === 0) this.mouse.left = value;
        if (button === 2) this.mouse.right = value;
    }

    isDown(code) { return this.keys.has(code); }
    wasPressed(code) { return this.pressedKeys.has(code); }

    takeEvents() {
        const list = this.events;
        this.events = [];
        return list;
    }

    endFrame() {
        this.pressedKeys.clear();
    }
}