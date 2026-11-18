<?php
// A player's collection of hero items: owning, equipping and receiving drops.
class Inventory
{
    // Waves a run must reach before a rarity may drop (checked on the server)
    private const MIN_WAVE = ['common' => 0, 'uncommon' => 0, 'rare' => 3, 'epic' => 8, 'legendary' => 10];

    // Every item the player owns, with the hero it is equipped on (if any)
    public static function forUser(int $userId): array
    {
        return Database::getInstance()->fetchAll(
            "SELECT pi.id AS player_item_id, i.id AS item_id, i.name, i.slot, i.rarity, i.description,
                    i.hp_pct, i.damage_pct, i.speed_pct, i.cdr_pct, i.lifesteal_pct, he.hero_id AS equipped_hero_id
             FROM player_items pi
             JOIN items i ON i.id = pi.item_id
             LEFT JOIN hero_equipment he ON he.player_item_id = pi.id AND he.user_id = pi.user_id
             WHERE pi.user_id = ?
             ORDER BY FIELD(i.rarity,'legendary','epic','rare','uncommon','common'), i.slot, i.name, pi.id",
            [$userId]
        );
    }

    // What one hero wears: [slot => item row]
    public static function equipped(int $userId, int $heroId): array
    {
        $rows = Database::getInstance()->fetchAll(
            'SELECT he.slot, pi.id AS player_item_id, i.name, i.rarity, i.description,
                    i.hp_pct, i.damage_pct, i.speed_pct, i.cdr_pct, i.lifesteal_pct
             FROM hero_equipment he
             JOIN player_items pi ON pi.id = he.player_item_id
             JOIN items i ON i.id = pi.item_id
             WHERE he.user_id = ? AND he.hero_id = ?',
            [$userId, $heroId]
        );
        $bySlot = [];
        foreach ($rows as $r) {
            $bySlot[$r['slot']] = $r;
        }
        return $bySlot;
    }

    // Total bonus percentages from everything the hero wears
    public static function totals(int $userId, int $heroId): array
    {
        $t = ['hp_pct' => 0, 'damage_pct' => 0, 'speed_pct' => 0, 'cdr_pct' => 0, 'lifesteal_pct' => 0];
        foreach (self::equipped($userId, $heroId) as $row) {
            foreach ($t as $k => $_) {
                $t[$k] += (int) $row[$k];
            }
        }
        return $t;
    }

    public static function equip(int $userId, int $heroId, int $playerItemId): void
    {
        $db = Database::getInstance();
        $item = $db->fetchOne(
            'SELECT i.slot FROM player_items pi JOIN items i ON i.id = pi.item_id WHERE pi.id = ? AND pi.user_id = ?',
            [$playerItemId, $userId]
        );
        if ($item === null) {
            throw new ValidationException('You do not own that item.');
        }
        if (Hero::byId($heroId) === null) {
            throw new ValidationException('That hero does not exist.');
        }
        try {
            $db->beginTransaction();
            $db->execute('DELETE FROM hero_equipment WHERE user_id = ? AND player_item_id = ?', [$userId, $playerItemId]);
            $db->execute(
                'INSERT INTO hero_equipment (user_id, hero_id, slot, player_item_id) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE player_item_id = ?',
                [$userId, $heroId, $item['slot'], $playerItemId, $playerItemId]
            );
            $db->commit();
        } catch (DatabaseException $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function unequip(int $userId, int $heroId, string $slot): void
    {
        if (!in_array($slot, Item::SLOTS, true)) {
            throw new ValidationException('Unknown slot.');
        }
        Database::getInstance()->execute(
            'DELETE FROM hero_equipment WHERE user_id = ? AND hero_id = ? AND slot = ?',
            [$userId, $heroId, $slot]
        );
    }

    public static function discard(int $userId, int $playerItemId): void
    {
        $gone = Database::getInstance()->execute(
            'DELETE FROM player_items WHERE id = ? AND user_id = ?',
            [$playerItemId, $userId]
        );
        if ($gone === 0) {
            throw new ValidationException('You do not own that item.');
        }
    }

    // Saves the items a finished run reports. The server limits how many and which rarities it accepts.
    // Returns the names of the items that were stored.
    public static function recordDrops(int $userId, array $itemIds, int $kills, int $waves, int $bossKills): array
    {
        $itemIds = array_values(array_filter(array_map('intval', $itemIds), fn($id) => $id > 0));
        $bossKills = max(0, min($bossKills, intdiv($waves, 10)));
        $max = (int) ceil($kills * 0.10) + 2 * $bossKills;       // generous: the real chance is about 4% per kill
        $itemIds = array_slice($itemIds, 0, max(0, $max));
        if (!$itemIds) {
            return [];
        }

        $db = Database::getInstance();
        $unique = array_values(array_unique($itemIds));
        $marks = implode(', ', array_fill(0, count($unique), '?'));
        $rows = $db->fetchAll("SELECT id, name, rarity FROM items WHERE is_active = 1 AND id IN ($marks)", $unique);
        $byId = [];
        foreach ($rows as $r) {
            $byId[(int) $r['id']] = $r;
        }

        $stored = [];
        try {
            $db->beginTransaction();
            foreach ($itemIds as $id) {
                $it = $byId[$id] ?? null;
                if ($it === null || $waves < (self::MIN_WAVE[$it['rarity']] ?? 99)) {
                    continue;
                }
                $db->execute('INSERT INTO player_items (user_id, item_id) VALUES (?, ?)', [$userId, $id]);
                $stored[] = $it['name'];
            }
            $db->commit();
        } catch (DatabaseException $e) {
            $db->rollBack();
            throw $e;
        }
        return $stored;
    }

    // Numbers for the admin dashboard
    public static function adminStats(): array
    {
        $db = Database::getInstance();
        $byRarity = [];
        foreach (Item::RARITIES as $r) {
            $byRarity[$r] = 0;
        }
        foreach ($db->fetchAll('SELECT i.rarity, COUNT(*) AS c FROM player_items pi JOIN items i ON i.id = pi.item_id GROUP BY i.rarity') as $row) {
            $byRarity[$row['rarity']] = (int) $row['c'];
        }
        $heroUse = $db->fetchAll(
            'SELECT h.name, COUNT(ph.user_id) AS players FROM heroes h LEFT JOIN player_hero ph ON ph.hero_id = h.id GROUP BY h.id, h.name ORDER BY players DESC, h.id'
        );
        return [
            'heroes'   => (int) $db->fetchOne('SELECT COUNT(*) AS c FROM heroes')['c'],
            'items'    => (int) $db->fetchOne('SELECT COUNT(*) AS c FROM items')['c'],
            'owned'    => (int) $db->fetchOne('SELECT COUNT(*) AS c FROM player_items')['c'],
            'byRarity' => $byRarity,
            'heroUse'  => $heroUse,
        ];
    }

    // Removes everything a deleted player owned (these tables have no foreign key to users)
    public static function purgeUser(int $userId): void
    {
        $db = Database::getInstance();
        foreach (['hero_equipment', 'player_items', 'player_hero'] as $table) {
            $db->execute("DELETE FROM $table WHERE user_id = ?", [$userId]);
        }
    }

    // Everything an item points to is removed with it
    public static function forgetItem(int $itemId): void
    {
        Database::getInstance()->execute('DELETE FROM player_items WHERE item_id = ?', [$itemId]);
    }
}