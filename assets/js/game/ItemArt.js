// ItemArt.js - small icons for hero items (weapon, armor, trinket), drawn in code.
export const RARITY_COLORS = {
    common: '#c8cdd6', uncommon: '#5fe07a', rare: '#4aa3ff', epic: '#b06bff', legendary: '#ffa020',
};

// Draws a 16-unit icon scaled to `size` pixels with its top-left corner at (x, y)
export function drawItemIcon(ctx, x, y, size, slot, rarity) {
    const col = RARITY_COLORS[rarity] || RARITY_COLORS.common;
    const s = size / 16;
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + a * s), Math.round(y + b * s), Math.ceil(w * s), Math.ceil(h * s)); };
    px(0, 0, 16, 16, '#14122a');
    px(0, 0, 16, 1, col); px(0, 15, 16, 1, col); px(0, 0, 1, 16, col); px(15, 0, 1, 16, col);
    if (slot === 'weapon') {
        for (let i = 0; i < 9; i++) px(3 + i, 11 - i, 2, 2, i > 6 ? '#ffffff' : '#dfe6f2');
        px(3, 9, 5, 1, '#ffd84a'); px(4, 8, 1, 3, '#ffd84a');
        px(2, 11, 2, 3, '#7a4a22');
        px(11, 3, 2, 2, col);
    } else if (slot === 'armor') {
        px(4, 3, 8, 9, '#9aa6bd');
        px(2, 3, 3, 4, '#c2ccde'); px(11, 3, 3, 4, '#c2ccde');
        px(6, 3, 4, 2, '#14122a');
        px(5, 12, 6, 2, '#6c7890');
        px(7, 6, 2, 5, col);
        px(4, 3, 2, 9, '#c2ccde');
    } else {
        px(6, 2, 4, 2, '#ffd84a'); px(5, 4, 6, 1, '#ffd84a');
        px(4, 5, 8, 6, col);
        px(5, 11, 6, 1, col); px(6, 12, 4, 1, col); px(7, 13, 2, 1, col);
        px(5, 6, 3, 2, '#ffffff');
        px(10, 9, 2, 2, 'rgba(0,0,0,0.3)');
    }
}