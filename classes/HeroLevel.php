<?php
// HeroLevel - hero levelling (max level 100). XP is stored per player per hero in hero_xp.
class HeroLevel
{
    public const MAX_LEVEL = 100;
    public const BONUS_PER_LEVEL = 1.2;     // % extra HP and damage for every level above 1

    // XP needed to go from $level to $level + 1
    public static function needFor(int $level): int
    {
        return 60 + 25 * $level;
    }

    // XP earned by one finished run (tune the numbers here)
    public static function xpForRun(int $score, int $kills, int $waves): int
    {
        return max(5, intdiv($score, 20) + $kills * 3 + $waves * 25);
    }

    // turns total XP into [level, xp into this level, xp needed for next]
    public static function fromXp(int $xp): array
    {
        $level = 1;
        while ($level < self::MAX_LEVEL && $xp >= self::needFor($level)) {
            $xp -= self::needFor($level);
            $level++;
        }
        $need = $level >= self::MAX_LEVEL ? 0 : self::needFor($level);
        return ['level' => $level, 'xp' => $level >= self::MAX_LEVEL ? 0 : $xp, 'need' => $need, 'bonus' => round(($level - 1) * self::BONUS_PER_LEVEL, 1)];
    }

    public static function totalXp(int $userId, int $heroId): int
    {
        $row = Database::getInstance()->fetchOne('SELECT xp FROM hero_xp WHERE user_id = ? AND hero_id = ?', [$userId, $heroId]);
        return $row === null ? 0 : (int) $row['xp'];
    }

    public static function info(int $userId, int $heroId): array
    {
        try {
            return self::fromXp(self::totalXp($userId, $heroId));
        } catch (Throwable $e) {                 // table not created yet: everyone is level 1
            return self::fromXp(0);
        }
    }

    // adds XP and returns ['before' => level, 'after' => level, 'gained' => xp, ...info]
    public static function award(int $userId, int $heroId, int $xp): array
    {
        $before = self::info($userId, $heroId)['level'];
        Database::getInstance()->execute(
            'INSERT INTO hero_xp (user_id, hero_id, xp) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE xp = xp + ?',
            [$userId, $heroId, $xp, $xp]
        );
        $info = self::info($userId, $heroId);
        return $info + ['before' => $before, 'gained' => $xp];
    }
}