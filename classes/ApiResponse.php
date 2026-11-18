<?php
class ApiResponse
{
    public static function json(array $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data);
        exit;
    }

    public static function fail(string $message, int $status = 400): never
    {
        self::json(['error' => $message], $status);
    }

    public static function requireMethod(string $method): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== $method) {
            self::fail('Method not allowed.', 405);
        }
    }

    public static function requireUser(): User
    {
        $user = Auth::user();
        if ($user === null) {
            self::fail('Not logged in.', 401);
        }
        return $user;
    }
        public static function requireCsrf(): void
    {
        try {
            Csrf::verify($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
        } catch (ValidationException $e) {
            self::fail($e->getMessage(), 403);
        }
    }

    public static function body(): array
    {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            self::fail('Invalid JSON body.', 400);
        }
        return $data;
    }
}