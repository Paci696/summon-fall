<?php
require_once __DIR__ . '/../../includes/autoload.php';
Auth::startSession();

if (Auth::check()) {
    header('Location: ' . BASE_URL . '/views/menu.php');
    exit;
}

$error = '';
$username = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    try {
        Csrf::verify($_POST['csrf'] ?? null);
        Auth::login($username, $_POST['password'] ?? '');
        header('Location: ' . BASE_URL . '/views/menu.php');
        exit;
    } catch (ValidationException $e) {
        $error = $e->getMessage();
    } catch (DatabaseException $e) {
        $error = DEBUG ? $e->getMessage() : 'Something went wrong. Please try again.';
    }
}

$pageTitle = 'Login';
require __DIR__ . '/../../includes/header.php';
?>
<div class="card">
    <h1>Login</h1>
    <?php if ($error): ?><div class="alert"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <form method="post">
        <?= Csrf::field() ?>
        <label for="username">Username</label>
        <input type="text" id="username" name="username" value="<?= htmlspecialchars($username) ?>" required>
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
        <button class="btn" type="submit">Enter</button>
    </form>
    <p>No account? <a href="<?= BASE_URL ?>/views/auth/register.php">Register</a></p>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>