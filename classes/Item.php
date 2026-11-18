<?php
class Item extends Model
{
    protected static string $table = 'items';

    public const SLOTS = ['weapon', 'armor', 'trinket'];
    public const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    public const RARITY_COLORS = [
        'common' => '#c8cdd6', 'uncommon' => '#5fe07a', 'rare' => '#4aa3ff',
        'epic' => '#b06bff', 'legendary' => '#ffa020',
    ];
    private const STAT_LABELS = [
        'hp_pct' => 'HP', 'damage_pct' => 'damage', 'speed_pct' => 'speed',
        'cdr_pct' => 'faster abilities', 'lifesteal_pct' => 'lifesteal',
    ];

    private string $name;
    private string $slot;
    private string $rarity;
    private string $description;
    private int $hpPct;
    private int $damagePct;
    private int $speedPct;
    private int $cdrPct;
    private int $lifestealPct;
    private bool $isActive;

    public function __construct(array $s, ?int $id = null)
    {
        parent::__construct($id);
        $this->name = $s['name'];
        $this->slot = $s['slot'];
        $this->rarity = $s['rarity'];
        $this->description = $s['description'] ?? '';
        $this->hpPct = (int) ($s['hp_pct'] ?? 0);
        $this->damagePct = (int) ($s['damage_pct'] ?? 0);
        $this->speedPct = (int) ($s['speed_pct'] ?? 0);
        $this->cdrPct = (int) ($s['cdr_pct'] ?? 0);
        $this->lifestealPct = (int) ($s['lifesteal_pct'] ?? 0);
        $this->isActive = (bool) ($s['is_active'] ?? 1);
        if (!in_array($this->slot, self::SLOTS, true) || !in_array($this->rarity, self::RARITIES, true)) {
            throw new ValidationException('Unknown item slot or rarity.');
        }
    }

    public function getName(): string { return $this->name; }
    public function getSlot(): string { return $this->slot; }
    public function getRarity(): string { return $this->rarity; }
    public function getDescription(): string { return $this->description; }
    public function isActive(): bool { return $this->isActive; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'name' => $this->name, 'slot' => $this->slot, 'rarity' => $this->rarity,
            'description' => $this->description, 'hp_pct' => $this->hpPct, 'damage_pct' => $this->damagePct,
            'speed_pct' => $this->speedPct, 'cdr_pct' => $this->cdrPct, 'lifesteal_pct' => $this->lifestealPct,
        ];
    }

    // "+10% damage, +8% lifesteal" for any row that has the *_pct columns
    public static function statText(array $row): string
    {
        $parts = [];
        foreach (self::STAT_LABELS as $col => $label) {
            if ((int) ($row[$col] ?? 0) !== 0) {
                $parts[] = '+' . (int) $row[$col] . '% ' . $label;
            }
        }
        return $parts ? implode(', ', $parts) : 'No bonus';
    }

    // Every active item, for the game (drops) and the hero page
    public static function catalog(): array
    {
        $rows = Database::getInstance()->fetchAll(
            "SELECT * FROM items WHERE is_active = 1 ORDER BY FIELD(rarity,'common','uncommon','rare','epic','legendary'), slot, id"
        );
        return array_map(fn($r) => static::fromRow($r)->toArray(), $rows);
    }

    // Admin list: filter by slot and rarity, whitelisted sort
    public static function search(string $q, string $slot, string $rarity, string $sort, string $dir): array
    {
        $cols = ['id', 'name', 'slot', 'rarity', 'hp_pct', 'damage_pct', 'cdr_pct', 'is_active'];
        $sort = in_array($sort, $cols, true) ? $sort : 'id';
        $order = $sort === 'rarity' ? "FIELD(rarity,'common','uncommon','rare','epic','legendary')" : $sort;
        $dir = strtolower($dir) === 'desc' ? 'DESC' : 'ASC';
        $sql = 'SELECT * FROM items WHERE 1=1';
        $params = [];
        if ($q !== '') {
            $sql .= ' AND (name LIKE ? OR description LIKE ?)';
            $params[] = "%$q%";
            $params[] = "%$q%";
        }
        if (in_array($slot, self::SLOTS, true)) {
            $sql .= ' AND slot = ?';
            $params[] = $slot;
        }
        if (in_array($rarity, self::RARITIES, true)) {
            $sql .= ' AND rarity = ?';
            $params[] = $rarity;
        }
        $sql .= " ORDER BY $order $dir, id ASC";
        return array_map(fn($r) => static::fromRow($r), Database::getInstance()->fetchAll($sql, $params));
    }

    public function getHpPct(): int { return $this->hpPct; }
    public function getDamagePct(): int { return $this->damagePct; }
    public function getSpeedPct(): int { return $this->speedPct; }
    public function getCdrPct(): int { return $this->cdrPct; }
    public function getLifestealPct(): int { return $this->lifestealPct; }

    protected static function fromRow(array $row): static
    {
        return new static($row, (int) $row['id']);
    }

    public function save(): bool
    {
        $cols = [
            'name' => $this->name, 'slot' => $this->slot, 'rarity' => $this->rarity, 'description' => $this->description,
            'hp_pct' => $this->hpPct, 'damage_pct' => $this->damagePct, 'speed_pct' => $this->speedPct,
            'cdr_pct' => $this->cdrPct, 'lifesteal_pct' => $this->lifestealPct, 'is_active' => (int) $this->isActive,
        ];
        if ($this->getId() === null) {
            $marks = implode(', ', array_fill(0, count($cols), '?'));
            $this->db->execute('INSERT INTO items (' . implode(', ', array_keys($cols)) . ') VALUES (' . $marks . ')', array_values($cols));
            $this->setId($this->db->lastInsertId());
        } else {
            $set = implode(', ', array_map(fn($c) => "$c = ?", array_keys($cols)));
            $this->db->execute("UPDATE items SET $set WHERE id = ?", [...array_values($cols), $this->getId()]);
        }
        return true;
    }
}