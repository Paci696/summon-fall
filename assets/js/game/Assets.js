export class Assets {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.images = new Map();
        this.json = new Map();
    }

    loadImage(key, path) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { this.images.set(key, img); resolve(img); };
            img.onerror = () => { console.warn('Missing image:', path); resolve(null); };
            img.src = this.baseUrl + path;
        });
    }

    async loadJson(key, path) {
        try {
            const res = await fetch(this.baseUrl + path);
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            this.json.set(key, data);
            return data;
        } catch (e) {
            console.warn('Missing json:', path);
            return null;
        }
    }

    // Loads "<basePath>.png" and "<basePath>.json" (an Aseprite export) under one key.
    async loadSprite(key, basePath) {
        await Promise.all([
            this.loadImage(key, basePath + '.png'),
            this.loadJson(key, basePath + '.json'),
        ]);
    }

    getImage(key) { return this.images.get(key) || null; }
    getJson(key) { return this.json.get(key) || null; }
}