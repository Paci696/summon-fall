<?php
class Auth
{
    private static ?User $current = null;

    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
            session_start();
        }
    }

    public static function login(string $username, string $password): User
    {
        $user = User::findByUsername(trim($username));
        if ($user === null || !$user->verifyPassword($password)) {
            throw new ValidationException('Invalid username or password.');
        }
        self::startSession();
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user->getId();
        self::$current = $user;
        return $user;
    }

    public static function register(array $input): PlayerUser
    {
        $v = new Validator($input);
        $v->required('username', 'Username')->username('username')
          ->required('email', 'Email')->email('email')
          ->required('password', 'Password')->minLength('password', 6, 'Password')
          ->matches('password', 'confirm', 'Passwords do not match.');
        $v->throwIfFails();

        $db = Database::getInstance();
        $errors = [];
        if ($db->fetchOne('SELECT id FROM users WHERE username = ?', [$input['username']])) {
            $errors['username'] = 'That username is already taken.';
        }
        if ($db->fetchOne('SELECT id FROM users WHERE email = ?', [$input['email']])) {
            $errors['email'] = 'That email is already registered.';
        }
        if ($errors) {
            throw new ValidationException('Please fix the errors below.', $errors);
        }

        $user = new PlayerUser($input['username'], $input['email'], '');
        $user->setPassword($input['password']);
        $user->save();
        return $user;
    }

    public static function user(): ?User
    {
        self::startSession();
        if (self::$current === null && isset($_SESSION['user_id'])) {
            self::$current = User::find((int) $_SESSION['user_id']);
        }
        return self::$current;
    }

    public static function check(): bool
    {
        return self::user() !== null;
    }

    public static function logout(): void
    {
        self::startSession();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        self::$current = null;
    }
}