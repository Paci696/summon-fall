<?php
abstract class User extends Model
{
    protected static string $table = 'users';

    private string $username;
    private string $email;
    private string $passwordHash;
    private int $souls;

    public function __construct(string $username, string $email, string $passwordHash, int $souls = 0, ?int $id = null)
    {
        parent::__construct($id);
        $this->setUsername($username);
        $this->setEmail($email);
        $this->passwordHash = $passwordHash;
        $this->souls = $souls;
    }

    public function getUsername(): string { return $this->username; }
    public function getEmail(): string { return $this->email; }
    public function getSouls(): int { return $this->souls; }

    public function setUsername(string $username): void
    {
        if (!preg_match('/^[A-Za-z0-9_]{3,30}$/', $username)) {
            throw new ValidationException('Username must be 3-30 letters, numbers or underscores.');
        }
        $this->username = $username;
    }

    public function setEmail(string $email): void
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ValidationException('Please enter a valid email address.');
        }
        $this->email = $email;
    }

    public function setPassword(string $plain): void
    {
        if (strlen($plain) < 6) {
            throw new ValidationException('Password must be at least 6 characters.');
        }
        $this->passwordHash = password_hash($plain, PASSWORD_DEFAULT);
    }

    public function verifyPassword(string $plain): bool
    {
        return password_verify($plain, $this->passwordHash);
    }

    public function addSouls(int $amount): void
    {
        $this->souls = max(0, $this->souls + $amount);
    }

    // Each role must define these (polymorphism)
    abstract public function getRole(): string;
    abstract public function getDashboardPath(): string;
    abstract public function canManageContent(): bool;

    public static function findByUsername(string $username): ?User
    {
        $row = Database::getInstance()->fetchOne('SELECT * FROM users WHERE username = ?', [$username]);
        return $row ? static::fromRow($row) : null;
    }

    protected static function fromRow(array $row): static
    {
        $class = $row['role'] === 'admin' ? AdminUser::class : PlayerUser::class;
        return new $class($row['username'], $row['email'], $row['password_hash'], (int) $row['souls'], (int) $row['id']);
    }

    public function save(): bool
    {
        $values = [$this->username, $this->email, $this->passwordHash, $this->getRole(), $this->souls];
        if ($this->getId() === null) {
            $this->db->execute('INSERT INTO users (username, email, password_hash, role, souls) VALUES (?, ?, ?, ?, ?)', $values);
            $this->setId($this->db->lastInsertId());
        } else {
            $this->db->execute('UPDATE users SET username = ?, email = ?, password_hash = ?, role = ?, souls = ? WHERE id = ?', [...$values, $this->getId()]);
        }
        return true;
    }
}