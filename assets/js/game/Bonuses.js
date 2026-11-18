// Returns a copy of the unit's stats with the player's skill bonuses applied.
export function applyBonuses(unit, bonuses) {
    const s = { ...unit };
    for (const b of bonuses) {
        if (b.unit_id !== null && b.unit_id !== unit.id) continue;
        const mult = 1 + b.value / 100;
        if (b.stat === 'hp') s.hp = Math.round(s.hp * mult);
        else if (b.stat === 'damage') s.damage = Math.round(s.damage * mult);
        else if (b.stat === 'speed') s.speed = Math.round(s.speed * mult);
        else if (b.stat === 'range') s.attack_range = Math.round(s.attack_range * mult);
        else if (b.stat === 'cost') s.cost = Math.max(1, Math.round(s.cost * mult));
    }
    return s;
}

export function flatBonus(bonuses, stat) {
    return bonuses.filter((b) => b.stat === stat).reduce((sum, b) => sum + b.value, 0);
}