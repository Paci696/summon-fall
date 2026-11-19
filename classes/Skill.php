<?php
class Skill extends Model
{
    protected static string $table = 'skills';

    private string $name;
    private string $description;
    private string $branch;
    private int $tier;
    private ?int $parentSkillId;
    private ?int $unitId;
    private string $stat;
    private float $bonusPerLevel;
    private int $baseCost;
    private float $costGrowth;
    private int $maxLevel;
    private ?string $unitLine;
    private int $unitTier;
    private ?int $unlocksUnitId;
    private ?int $heroId;
    public function __construct(array $s, ?int $id = null)
    {
        parent::__construct($id);
        $this->name = $s['name'];
        $this->description = $s['description'];
        $this->branch = $s['branch'];
        $this->tier = (int) $s['tier'];
        $this->parentSkillId = $s['parent_skill_id'] !== null ? (int) $s['parent_skill_id'] : null;
        $this->unitId = $s['unit_id'] !== null ? (int) $s['unit_id'] : null;
        $this->stat = $s['stat'];
        $this->bonusPerLevel = (float) $s['bonus_per_level'];
        $this->baseCost = (int) $s['base_cost'];
        $this->costGrowth = (float) $s['cost_growth'];
        $this->maxLevel = (int) $s['max_level'];
        $this->unitLine = $s['unit_line'] ?? null;
        $this->unitTier = (int) ($s['unit_tier'] ?? 0);
        $this->unlocksUnitId = isset($s['unlocks_unit_id']) ? (int) $s['unlocks_unit_id'] : null;
        $this->heroId = isset($s['hero_id']) ? (int) $s['hero_id'] : null;
    }
    public const BRANCHES = ['warrior', 'ranger', 'economy', 'summoner', 'hero'];
    public const STATS = ['hp', 'damage', 'speed', 'range', 'cost', 'start_gold', 'summon_cooldown', 'meteor', 'cdr', 'ability', 'revive', 'raise', 'horde', 'spell_frost','spell_heal','spell_rally','spell_storm','spell_cdr'];
    public function getName(): string { return $this->name; }
    public function getDescription(): string { return $this->description; }
    public function getBranch(): string { return $this->branch; }
    public function getTier(): int { return $this->tier; }
    public function getParentSkillId(): ?int { return $this->parentSkillId; }
    public function getUnitId(): ?int { return $this->unitId; }
    public function getStat(): string { return $this->stat; }
    public function getBonusPerLevel(): float { return $this->bonusPerLevel; }
    public function getBaseCost(): int { return $this->baseCost; }
    public function getCostGrowth(): float { return $this->costGrowth; }
    public function getMaxLevel(): int { return $this->maxLevel; }
    public function getUnitLine(): ?string { return $this->unitLine; }
    public function getUnitTier(): int { return $this->unitTier; }
    public function getUnlocksUnitId(): ?int { return $this->unlocksUnitId; }
    public function getHeroId(): ?int { return $this->heroId; }

    // Souls needed to buy the next level, given how many levels the player already owns (0 = none).
    public function costForLevel(int $currentLevel): int
    {
        return (int) round($this->baseCost * ($this->costGrowth ** $currentLevel));
    }

    // Total bonus per skill for one player: [{unit_id, stat, value}, ...]
    public static function bonusesForUser(int $userId): array
    {
        $rows = Database::getInstance()->fetchAll(
            'SELECT s.unit_id, s.stat, s.bonus_per_level * ps.level AS value
             FROM player_skills ps JOIN skills s ON s.id = ps.skill_id
             WHERE ps.user_id = ? AND s.hero_id IS NULL',
            [$userId]
        );
        return array_map(fn($r) => [
            'unit_id' => $r['unit_id'] !== null ? (int) $r['unit_id'] : null,
            'stat'    => $r['stat'],
            'value'   => (float) $r['value'],
        ], $rows);
    }

    // Hero skill bonuses for one hero: [stat => total value] (percent for most stats)
    public static function heroBonusesForUser(int $userId, int $heroId): array
    {
        $rows = Database::getInstance()->fetchAll(
            'SELECT s.stat, SUM(s.bonus_per_level * ps.level) AS value
             FROM player_skills ps JOIN skills s ON s.id = ps.skill_id
             WHERE ps.user_id = ? AND s.hero_id = ? GROUP BY s.stat',
            [$userId, $heroId]
        );
        $out = [];
        foreach ($rows as $r) {
            $out[$r['stat']] = (float) $r['value'];
        }
        return $out;
    }

    // Every skill with the level this player owns (0 = not bought)
    public static function allWithLevels(int $userId): array
    {
        $rows = Database::getInstance()->fetchAll(
            'SELECT s.*, COALESCE(ps.level, 0) AS owned_level
             FROM skills s
             LEFT JOIN player_skills ps ON ps.skill_id = s.id AND ps.user_id = ?
             ORDER BY s.branch, s.tier, s.id',
            [$userId]
        );
        return array_map(fn($r) => ['skill' => static::fromRow($r), 'level' => (int) $r['owned_level']], $rows);
    }

    // Buys one level of a skill. Everything happens in one transaction.
    public static function purchase(User $user, int $skillId): array
    {
        $db = Database::getInstance();
        try {
            $db->beginTransaction();

            $row = $db->fetchOne('SELECT * FROM skills WHERE id = ?', [$skillId]);
            if ($row === null) {
                throw new ValidationException('That skill does not exist.');
            }
            $skill = static::fromRow($row);

            $owned = $db->fetchOne(
                'SELECT level FROM player_skills WHERE user_id = ? AND skill_id = ? FOR UPDATE',
                [$user->getId(), $skillId]
            );
            $level = $owned ? (int) $owned['level'] : 0;
            if ($level >= $skill->maxLevel) {
                throw new ValidationException('This skill is already at max level.');
            }

            if ($skill->parentSkillId !== null) {
                $parent = $db->fetchOne(
                    'SELECT level FROM player_skills WHERE user_id = ? AND skill_id = ?',
                    [$user->getId(), $skill->parentSkillId]
                );
                if ($parent === null) {
                    throw new ValidationException('Unlock the previous skill first.');
                }
            }
            // Elite / Godly unlock: every skill of the previous tier in this line must be at max level
            if ($skill->unlocksUnitId !== null && $skill->unitTier > 0) {
                $left = $db->fetchOne(
                    'SELECT COUNT(*) AS n
                     FROM skills s
                     LEFT JOIN player_skills ps ON ps.skill_id = s.id AND ps.user_id = ?
                     WHERE s.unit_line = ? AND s.unit_tier = ? AND COALESCE(ps.level, 0) < s.max_level',
                    [$user->getId(), $skill->unitLine, $skill->unitTier - 1]
                );
                if ((int) $left['n'] > 0) {
                    throw new ValidationException('Max out every ' . ucfirst((string) $skill->unitLine) . ' upgrade of the previous tier first.');
                }
            }

            $cost = $skill->costForLevel($level);
            $spent = $db->execute(
                'UPDATE users SET souls = souls - ? WHERE id = ? AND souls >= ?',
                [$cost, $user->getId(), $cost]
            );
            if ($spent === 0) {
                throw new ValidationException('Not enough souls.');
            }

            $db->execute(
                'INSERT INTO player_skills (user_id, skill_id, level) VALUES (?, ?, 1)
                 ON DUPLICATE KEY UPDATE level = level + 1',
                [$user->getId(), $skillId]
            );
            $db->commit();
            return ['name' => $skill->name, 'level' => $level + 1, 'cost' => $cost];
        } catch (ValidationException | DatabaseException $e) {
            $db->rollBack();
            throw $e;
        }
    }
    public static function search(string $q, string $branch, string $sort, string $dir): array
    {
        $cols = ['id', 'name', 'branch', 'tier', 'stat', 'base_cost', 'max_level'];
        $sort = in_array($sort, $cols, true) ? $sort : 'id';
        $dir = strtolower($dir) === 'desc' ? 'DESC' : 'ASC';

        $sql = 'SELECT * FROM skills WHERE 1=1';
        $params = [];
        if ($q !== '') {
            $sql .= ' AND (name LIKE ? OR description LIKE ?)';
            $params[] = "%$q%";
            $params[] = "%$q%";
        }
        if (in_array($branch, self::BRANCHES, true)) {
            $sql .= ' AND branch = ?';
            $params[] = $branch;
        }
        $sql .= " ORDER BY $sort $dir";
        return array_map(fn($r) => static::fromRow($r), Database::getInstance()->fetchAll($sql, $params));
    }
    protected static function fromRow(array $row): static
    {
        return new static($row, (int) $row['id']);
    }

    public function save(): bool
    {
        $cols = [
            'name' => $this->name, 'description' => $this->description, 'branch' => $this->branch,
            'tier' => $this->tier, 'parent_skill_id' => $this->parentSkillId, 'unit_id' => $this->unitId,
            'stat' => $this->stat, 'bonus_per_level' => $this->bonusPerLevel, 'base_cost' => $this->baseCost,
            'cost_growth' => $this->costGrowth, 'max_level' => $this->maxLevel, 'hero_id' => $this->heroId,
        ];
        if ($this->getId() === null) {
            $marks = implode(', ', array_fill(0, count($cols), '?'));
            $this->db->execute('INSERT INTO skills (' . implode(', ', array_keys($cols)) . ') VALUES (' . $marks . ')', array_values($cols));
            $this->setId($this->db->lastInsertId());
        } else {
            $set = implode(', ', array_map(fn($c) => "$c = ?", array_keys($cols)));
            $this->db->execute("UPDATE skills SET $set WHERE id = ?", [...array_values($cols), $this->getId()]);
        }
        return true;
    }
}