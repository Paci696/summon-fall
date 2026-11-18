<?php
class Csrf
{
    public static function token(): string
    {
        Auth::startSession();
        if (empty($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf'];
    }

    public static function field(): string
    {
        return '<input type="hidden" name="csrf" value="' . self::token() . '">';
    }

    public static function verify(?string $token): void
    {
        Auth::startSession();
        if (!$token || !hash_equals($_SESSION['csrf'] ?? '', $token)) {
            throw new ValidationException('Invalid form token. Please reload the page and try again.');
        }
    }
}