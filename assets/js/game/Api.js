export class Api {
    constructor(baseUrl, csrf = '') {
        this.baseUrl = baseUrl;
        this.csrf = csrf;
    }

    async request(path, options = {}) {
        const res = await fetch(this.baseUrl + path, { credentials: 'same-origin', ...options });
        if (!res.ok) {
            let message = res.statusText;
            try { message = (await res.json()).error || message; } catch (e) { /* not JSON */ }
            throw new Error(message);
        }
        return res.json();
    }

    get(path) {
        return this.request(path);
    }

    post(path, body) {
        return this.request(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf },
            body: JSON.stringify(body),
        });
    }

    loadUnits() {
        return this.get('/api/units.php');
    }
}