<?php
abstract class Model implements Crudable
{
    protected static string $table = '';
    private ?int $id;
    protected Database $db;

    public function __construct(?int $id = null)
    {
        $this->id = $id;
        $this->db = Database::getInstance();
    }

    public function getId(): ?int { return $this->id; }
    protected function setId(int $id): void { $this->id = $id; }

    abstract protected static function fromRow(array $row): static;

    public static function find(int $id): ?static
    {
        $row = Database::getInstance()->fetchOne('SELECT * FROM ' . static::$table . ' WHERE id = ?', [$id]);
        return $row ? static::fromRow($row) : null;
    }

    public static function all(): array
    {
        $rows = Database::getInstance()->fetchAll('SELECT * FROM ' . static::$table . ' ORDER BY id');
        return array_map(fn($r) => static::fromRow($r), $rows);
    }

    public function delete(): bool
    {
        if ($this->id === null) {
            return false;
        }
        return $this->db->execute('DELETE FROM ' . static::$table . ' WHERE id = ?', [$this->id]) > 0;
    }
}