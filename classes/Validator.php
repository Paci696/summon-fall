<?php
class Validator
{
    private array $data;
    private array $errors = [];

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    private function value(string $field): string
    {
        return (string) ($this->data[$field] ?? '');
    }

    private function fail(string $field, string $message): void
    {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = $message;
        }
    }

    public function required(string $field, string $label): self
    {
        if (trim($this->value($field)) === '') {
            $this->fail($field, "$label is required.");
        }
        return $this;
    }

    public function minLength(string $field, int $min, string $label): self
    {
        $v = $this->value($field);
        if ($v !== '' && strlen($v) < $min) {
            $this->fail($field, "$label must be at least $min characters.");
        }
        return $this;
    }

    public function email(string $field): self
    {
        $v = $this->value($field);
        if ($v !== '' && !filter_var($v, FILTER_VALIDATE_EMAIL)) {
            $this->fail($field, 'Please enter a valid email address.');
        }
        return $this;
    }

    public function username(string $field): self
    {
        $v = $this->value($field);
        if ($v !== '' && !preg_match('/^[A-Za-z0-9_]{3,30}$/', $v)) {
            $this->fail($field, 'Username must be 3-30 letters, numbers or underscores.');
        }
        return $this;
    }

    public function matches(string $field, string $other, string $message): self
    {
        if ($this->value($field) !== $this->value($other)) {
            $this->fail($other, $message);
        }
        return $this;
    }
        public function maxLength(string $field, int $max, string $label): self
    {
        if (strlen($this->value($field)) > $max) {
            $this->fail($field, "$label must be at most $max characters.");
        }
        return $this;
    }

    public function integer(string $field, int $min, int $max, string $label): self
    {
        $v = trim($this->value($field));
        if ($v !== '' && (!preg_match('/^-?\d+$/', $v) || (int) $v < $min || (int) $v > $max)) {
            $this->fail($field, "$label must be a whole number from $min to $max.");
        }
        return $this;
    }

    public function decimal(string $field, float $min, float $max, string $label): self
    {
        $v = trim($this->value($field));
        if ($v !== '' && (!is_numeric($v) || (float) $v < $min || (float) $v > $max)) {
            $this->fail($field, "$label must be a number from $min to $max.");
        }
        return $this;
    }

    public function inList(string $field, array $allowed, string $label): self
    {
        $v = $this->value($field);
        if ($v !== '' && !in_array($v, $allowed, true)) {
            $this->fail($field, "$label has an invalid value.");
        }
        return $this;
    }

    public function pattern(string $field, string $regex, string $message): self
    {
        $v = $this->value($field);
        if ($v !== '' && !preg_match($regex, $v)) {
            $this->fail($field, $message);
        }
        return $this;
    }
    public function fails(): bool
    {
        return count($this->errors) > 0;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function throwIfFails(): void
    {
        if ($this->fails()) {
            throw new ValidationException('Please fix the errors below.', $this->errors);
        }
    }
}