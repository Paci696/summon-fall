export class Camera {
    constructor(viewW, viewH, worldW, worldH) {
        this.viewW = viewW;
        this.viewH = viewH;
        this.worldW = worldW;
        this.worldH = worldH;
        this.x = 0;
        this.y = 0;
    }

    clamp() {
        this.x = Math.max(0, Math.min(this.x, this.worldW - this.viewW));
        this.y = Math.max(0, Math.min(this.y, this.worldH - this.viewH));
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
        this.clamp();
    }

    centerOn(wx, wy) {
        this.x = wx - this.viewW / 2;
        this.y = wy - this.viewH / 2;
        this.clamp();
    }

    worldToScreen(wx, wy) {
        return { x: Math.round(wx - this.x), y: Math.round(wy - this.y) };
    }

    screenToWorld(sx, sy) {
        return { x: sx + this.x, y: sy + this.y };
    }
}