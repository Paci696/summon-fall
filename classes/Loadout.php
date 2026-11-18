<?php
class Loadout
{
    public const SLOTS = 10;

    // Unit ids in slot order. An empty array means the player never saved a loadout.
    public static function idsFor(int $userId): array
    {
        $rows = Database::getInstance()->fetchAll(
            'SELECT unit_id FROM player_loadout WHERE user_id = ? ORDER BY slot',
            [$userId]
        );
        return array_map(fn($r) => (int) $r['unit_id'], $rows);
    }

    // Saves the chosen units (0 = empty slot). Only unlocked units are allowed, each once.
    public static function save(int $userId, array $unitIds): void
    {
        $allowed = array_map(fn($u) => $u->getId(), Unit::availableForUser($userId));
        $clean = [];
        foreach ($unitIds as $id) {
            $id = (int) $id;
            if ($id === 0) {
                continue;
            }
            if (!in_array($id, $allowed, true)) {
                throw new ValidationException('You have not unlocked one of those units.');
            }
            if (in_array($id, $clean, true)) {
                throw new ValidationException('Each unit can only be in the loadout once.');
            }
            $clean[] = $id;
        }
        if (count($clean) === 0) {
            throw new ValidationException('Pick at least one unit.');
        }
        if (count($clean) > self::SLOTS) {
            throw new ValidationException('A loadout has at most ' . self::SLOTS . ' units.');
        }

        $db = Database::getInstance();
        try {
            $db->beginTransaction();
            $db->execute('DELETE FROM player_loadout WHERE user_id = ?', [$userId]);
            foreach ($clean as $i => $id) {
                $db->execute(
                    'INSERT INTO player_loadout (user_id, slot, unit_id) VALUES (?, ?, ?)',
                    [$userId, $i + 1, $id]
                );
            }
            $db->commit();
        } catch (DatabaseException $e) {
            $db->rollBack();
            throw $e;
        }
    }
}