<?php
abstract class Unit extends Model
{
    protected static string $table = 'units';
    protected const CLASS_TYPE = '';

    private const MAP = [
        'miner' => Miner::class, 'swordsman' => Swordsman::class,
        'archer' => Archer::class, 'mage' => Mage::class, 'healer' => Healer::class,
        'slime' => Slime::class, 'goblin' => Goblin::class,
        'goblin_archer' => GoblinArcher::class, 'giant' => Giant::class,
        'zombie' => Zombie::class, 'ghoul' => Ghoul::class,
    ];

    private string $name;
    private string $faction;
    private int $cost;
    private int $hp;
    private int $damage;
    private int $speed;
    private int $attackRange;
    private int $attackCooldown;
    private string $spriteKey;
    private int $dropSouls;
    private float $dropChance;
    private int $firstWave;
    private int $spawnWeight;
    private bool $isActive;
    private ?string $unitLine;
    private int $tier;

    public function __construct(array $s, ?int $id = null)
    {
        parent::__construct($id);
        $this->name = $s['name'];
        $this->faction = $s['faction'];
        $this->cost = (int) $s['cost'];
        $this->hp = (int) $s['hp'];
        $this->damage = (int) $s['damage'];
        $this->speed = (int) $s['speed'];
        $this->attackRange = (int) $s['attack_range'];
        $this->attackCooldown = (int) $s['attack_cooldown'];
        $this->spriteKey = $s['sprite_key'];
        $this->dropSouls = (int) $s['drop_souls'];
        $this->dropChance = (float) $s['drop_chance'];
        $this->firstWave = (int) $s['first_wave'];
        $this->spawnWeight = (int) $s['spawn_weight'];
        $this->isActive = (bool) $s['is_active'];
        $this->unitLine = $s['unit_line'] ?? null;
        $this->tier = (int) ($s['tier'] ?? 0);
    }

    public function getName(): string { return $this->name; }
    public function getFaction(): string { return $this->faction; }
    public function getCost(): int { return $this->cost; }
    public function getHp(): int { return $this->hp; }
    public function getDamage(): int { return $this->damage; }
    public function getSpeed(): int { return $this->speed; }
    public function getAttackRange(): int { return $this->attackRange; }
    public function getAttackCooldown(): int { return $this->attackCooldown; }
    public function getSpriteKey(): string { return $this->spriteKey; }
    public function getDropSouls(): int { return $this->dropSouls; }
    public function getDropChance(): float { return $this->dropChance; }
    public function getFirstWave(): int { return $this->firstWave; }
    public function getSpawnWeight(): int { return $this->spawnWeight; }
    public function isActive(): bool { return $this->isActive; }
    public function getClassType(): string { return static::CLASS_TYPE; }
    public function getUnitLine(): ?string { return $this->unitLine; }
    public function getTier(): int { return $this->tier; }

    public function setHp(int $hp): void
    {
        if ($hp < 1) {
            throw new ValidationException('HP must be at least 1.');
        }
        $this->hp = $hp;
    }

    public function setDamage(int $damage): void
    {
        if ($damage < 0) {
            throw new ValidationException('Damage cannot be negative.');
        }
        $this->damage = $damage;
    }

    // Each unit type overrides these (polymorphism)
    abstract public function getRole(): string;
    abstract public function getAttackType(): string; // gather, melee, ranged, area

    public function describe(): string
    {
        return "{$this->name} ({$this->getRole()}): {$this->getAttackType()} attack, HP {$this->hp}, damage {$this->damage}";
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'name' => $this->name, 'class_type' => $this->getClassType(),
            'faction' => $this->faction, 'role' => $this->getRole(), 'attack_type' => $this->getAttackType(),
            'cost' => $this->cost, 'hp' => $this->hp, 'damage' => $this->damage, 'speed' => $this->speed,
            'attack_range' => $this->attackRange, 'attack_cooldown' => $this->attackCooldown,
            'sprite_key' => $this->spriteKey, 'drop_souls' => $this->dropSouls,
            'drop_chance' => $this->dropChance, 'first_wave' => $this->firstWave,
            'spawn_weight' => $this->spawnWeight,
            'unit_line' => $this->unitLine, 'unit_tier' => $this->tier,
        ];
    }

    public static function activeByFaction(string $faction): array
    {
        $rows = Database::getInstance()->fetchAll(
            'SELECT * FROM units WHERE faction = ? AND is_active = 1 ORDER BY id', [$faction]
        );
        return array_map(fn($r) => static::fromRow($r), $rows);
    }
    public static function availableForUser(int $userId): array
    {
        $rows = Database::getInstance()->fetchAll(
            'SELECT * FROM units
             WHERE faction = ? AND is_active = 1
               AND (tier = 0 OR id IN (
                    SELECT s.unlocks_unit_id
                    FROM player_skills ps JOIN skills s ON s.id = ps.skill_id
                    WHERE ps.user_id = ? AND ps.level >= 1 AND s.unlocks_unit_id IS NOT NULL))
             ORDER BY tier, id',
            ['player', $userId]
        );
        return array_map(fn($r) => static::fromRow($r), $rows);
    }
        public static function types(): array
    {
        return array_keys(self::MAP);
    }

    public static function make(array $row, ?int $id = null): Unit
    {
        $class = self::MAP[$row['class_type'] ?? ''] ?? null;
        if ($class === null) {
            throw new ValidationException('Unknown unit type.');
        }
        return new $class($row, $id);
    }

    public static function search(string $q, string $faction, string $sort, string $dir): array
    {
        $cols = ['id', 'name', 'class_type', 'faction', 'cost', 'hp', 'damage', 'first_wave', 'is_active'];
        $sort = in_array($sort, $cols, true) ? $sort : 'id';
        $dir = strtolower($dir) === 'desc' ? 'DESC' : 'ASC';

        $sql = 'SELECT * FROM units WHERE 1=1';
        $params = [];
        if ($q !== '') {
            $sql .= ' AND (name LIKE ? OR class_type LIKE ?)';
            $params[] = "%$q%";
            $params[] = "%$q%";
        }
        if (in_array($faction, ['player', 'mob'], true)) {
            $sql .= ' AND faction = ?';
            $params[] = $faction;
        }
        $sql .= " ORDER BY $sort $dir";
        return array_map(fn($r) => static::fromRow($r), Database::getInstance()->fetchAll($sql, $params));
    }
    protected static function fromRow(array $row): static
    {
        $class = self::MAP[$row['class_type']] ?? null;
        if ($class === null) {
            throw new DatabaseException('Unknown unit type: ' . $row['class_type']);
        }
        return new $class($row, (int) $row['id']);
    }

    public function save(): bool
    {
        $cols = [
            'name' => $this->name, 'class_type' => $this->getClassType(), 'faction' => $this->faction,
            'cost' => $this->cost, 'hp' => $this->hp, 'damage' => $this->damage, 'speed' => $this->speed,
            'attack_range' => $this->attackRange, 'attack_cooldown' => $this->attackCooldown,
            'sprite_key' => $this->spriteKey, 'drop_souls' => $this->dropSouls,
            'drop_chance' => $this->dropChance, 'first_wave' => $this->firstWave,
            'spawn_weight' => $this->spawnWeight, 'is_active' => (int) $this->isActive,
        ];
        if ($this->getId() === null) {
            $marks = implode(', ', array_fill(0, count($cols), '?'));
            $this->db->execute('INSERT INTO units (' . implode(', ', array_keys($cols)) . ') VALUES (' . $marks . ')', array_values($cols));
            $this->setId($this->db->lastInsertId());
        } else {
            $set = implode(', ', array_map(fn($c) => "$c = ?", array_keys($cols)));
            $this->db->execute("UPDATE units SET $set WHERE id = ?", [...array_values($cols), $this->getId()]);
        }
        return true;
    }
}