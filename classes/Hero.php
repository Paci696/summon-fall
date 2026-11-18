<?php
abstract class Hero extends Model
{
    protected static string $table = 'heroes';
    protected const CLASS_TYPE = '';

    private const MAP = [
        'knight' => KnightHero::class,
        'archer' => ArcherHero::class,
        'mage'   => MageHero::class,
        'lycan'  => LycanHero::class,
        'necromancer' => NecromancerHero::class,
    ];

    private string $name;
    private string $description;
    private int $hp;
    private int $damage;
    private int $speed;
    private int $attackRange;
    private int $attackCooldown;
    private string $spriteKey;
    private int $reviveSec;
    private bool $isActive;

    public function __construct(array $s, ?int $id = null)
    {
        parent::__construct($id);
        $this->name = $s['name'];
        $this->description = $s['description'] ?? '';
        $this->hp = (int) $s['hp'];
        $this->damage = (int) $s['damage'];
        $this->speed = (int) $s['speed'];
        $this->attackRange = (int) $s['attack_range'];
        $this->attackCooldown = (int) $s['attack_cooldown'];
        $this->spriteKey = $s['sprite_key'];
        $this->reviveSec = (int) ($s['revive_sec'] ?? 30);
        $this->isActive = (bool) ($s['is_active'] ?? 1);
    }

    public function getName(): string { return $this->name; }
    public function getDescription(): string { return $this->description; }
    public function getHp(): int { return $this->hp; }
    public function getDamage(): int { return $this->damage; }
    public function getSpeed(): int { return $this->speed; }
    public function getAttackRange(): int { return $this->attackRange; }
    public function getAttackCooldown(): int { return $this->attackCooldown; }
    public function getSpriteKey(): string { return $this->spriteKey; }
    public function getReviveSec(): int { return $this->reviveSec; }
    public function isActive(): bool { return $this->isActive; }
    public function getClassType(): string { return static::CLASS_TYPE; }

    // Each hero type overrides these (polymorphism)
    abstract public function getRole(): string;        // Tank, Marksman, Caster
    abstract public function getAttackType(): string;  // melee, ranged, area

    public function describe(): string
    {
        return "{$this->name} ({$this->getRole()}): {$this->getAttackType()} attack, HP {$this->hp}, damage {$this->damage}";
    }

    // The three active abilities, in slot order
    public function abilities(): array
    {
        $rows = Database::getInstance()->fetchAll(
            'SELECT * FROM hero_abilities WHERE hero_id = ? ORDER BY slot',
            [$this->getId()]
        );
        return array_map(fn($r) => [
            'slot' => (int) $r['slot'], 'name' => $r['name'], 'description' => $r['description'],
            'ability_type' => $r['ability_type'], 'cooldown_sec' => (int) $r['cooldown_sec'],
            'power' => (int) $r['power'], 'radius' => (int) $r['radius'], 'duration_sec' => (int) $r['duration_sec'],
        ], $rows);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'name' => $this->name, 'class_type' => $this->getClassType(),
            'role' => $this->getRole(), 'attack_type' => $this->getAttackType(), 'description' => $this->description,
            'hp' => $this->hp, 'damage' => $this->damage, 'speed' => $this->speed,
            'attack_range' => $this->attackRange, 'attack_cooldown' => $this->attackCooldown,
            'sprite_key' => $this->spriteKey, 'revive_sec' => $this->reviveSec,
        ];
    }

    protected static function fromRow(array $row): static
    {
        $type = $row['class_type'] ?? strtolower($row['name']);   // the heroes table has no class_type column: the name picks the class
        $class = self::MAP[$type] ?? null;
        if ($class === null) {
            throw new DatabaseException('Unknown hero type: ' . $type);
        }
        return new $class($row, (int) $row['id']);
    }

    public static function activeAll(): array
    {
        $rows = Database::getInstance()->fetchAll('SELECT * FROM heroes WHERE is_active = 1 ORDER BY id');
        return array_map(fn($r) => static::fromRow($r), $rows);
    }

    public static function byId(int $id): ?Hero
    {
        $row = Database::getInstance()->fetchOne('SELECT * FROM heroes WHERE id = ? AND is_active = 1', [$id]);
        return $row === null ? null : static::fromRow($row);
    }

    // The hero the player chose for battle (the first hero if they never chose)
    public static function selectedFor(int $userId): Hero
    {
        $db = Database::getInstance();
        $row = $db->fetchOne(
            'SELECT h.* FROM heroes h JOIN player_hero ph ON ph.hero_id = h.id
             WHERE ph.user_id = ? AND h.is_active = 1',
            [$userId]
        );
        if ($row === null) {
            $row = $db->fetchOne('SELECT * FROM heroes WHERE is_active = 1 ORDER BY id LIMIT 1');
        }
        if ($row === null) {
            throw new DatabaseException('No heroes are set up.');
        }
        return static::fromRow($row);
    }

    public static function select(int $userId, int $heroId): void
    {
        if (self::byId($heroId) === null) {
            throw new ValidationException('That hero does not exist.');
        }
        Database::getInstance()->execute(
            'INSERT INTO player_hero (user_id, hero_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE hero_id = ?',
            [$userId, $heroId, $heroId]
        );
    }

    public static function make(array $row, ?int $id = null): Hero
    {
        $class = self::MAP[strtolower((string) ($row['name'] ?? ''))] ?? null;
        if ($class === null) {
            throw new ValidationException('Unknown hero type.');
        }
        return new $class($row, $id);
    }

    // Admin list: every hero (also inactive ones), searchable and sortable
    public static function search(string $q, string $sort, string $dir): array
    {
        $cols = ['id', 'name', 'hp', 'damage', 'speed', 'attack_range', 'revive_sec', 'is_active'];
        $sort = in_array($sort, $cols, true) ? $sort : 'id';
        $dir = strtolower($dir) === 'desc' ? 'DESC' : 'ASC';
        $sql = 'SELECT * FROM heroes WHERE 1=1';
        $params = [];
        if ($q !== '') {
            $sql .= ' AND (name LIKE ? OR description LIKE ?)';
            $params[] = "%$q%";
            $params[] = "%$q%";
        }
        $sql .= " ORDER BY $sort $dir";
        return array_map(fn($r) => static::fromRow($r), Database::getInstance()->fetchAll($sql, $params));
    }

    public static function updateAbility(int $heroId, int $slot, int $cooldown, int $power, int $radius, int $duration): void
    {
        Database::getInstance()->execute(
            'UPDATE hero_abilities SET cooldown_sec = ?, power = ?, radius = ?, duration_sec = ? WHERE hero_id = ? AND slot = ?',
            [$cooldown, $power, $radius, $duration, $heroId, $slot]
        );
    }

    public function save(): bool
    {
        $cols = [
            'name' => $this->name, 'description' => $this->description,
            'hp' => $this->hp, 'damage' => $this->damage, 'speed' => $this->speed,
            'attack_range' => $this->attackRange, 'attack_cooldown' => $this->attackCooldown,
            'sprite_key' => $this->spriteKey, 'revive_sec' => $this->reviveSec, 'is_active' => (int) $this->isActive,
        ];
        if ($this->getId() === null) {
            $marks = implode(', ', array_fill(0, count($cols), '?'));
            $this->db->execute('INSERT INTO heroes (' . implode(', ', array_keys($cols)) . ') VALUES (' . $marks . ')', array_values($cols));
            $this->setId($this->db->lastInsertId());
        } else {
            $set = implode(', ', array_map(fn($c) => "$c = ?", array_keys($cols)));
            $this->db->execute("UPDATE heroes SET $set WHERE id = ?", [...array_values($cols), $this->getId()]);
        }
        return true;
    }
}