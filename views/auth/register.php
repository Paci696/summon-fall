<?php
require_once __DIR__ . '/../../includes/autoload.php';
Auth::startSession();

if (Auth::check()) {
    header('Location: ' . BASE_URL . '/views/menu.php');
    exit;
}

$errors = [];
$error = '';
$input = ['username' => '', 'email' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = [
        'username' => trim($_POST['username'] ?? ''),
        'email'    => trim($_POST['email'] ?? ''),
        'password' => $_POST['password'] ?? '',
        'confirm'  => $_POST['confirm'] ?? '',
    ];
    try {
        Csrf::verify($_POST['csrf'] ?? null);
        Auth::register($input);
        Auth::login($input['username'], $input['password']);
        header('Location: ' . BASE_URL . '/views/menu.php');
        exit;
    } catch (ValidationException $e) {
        $error = $e->getMessage();
        $errors = $e->getErrors();
    } catch (DatabaseException $e) {
        $error = DEBUG ? $e->getMessage() : 'Something went wrong. Please try again.';
    }
}

$pageTitle = 'Register';
require __DIR__ . '/../../includes/header.php';
?>
<div class="card">
    <h1>Create account</h1>
    <?php if ($error): ?><div class="alert"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <form method="post">
        <?= Csrf::field() ?>
        <label for="username">Username</label>
        <input type="text" id="username" name="username" value="<?= htmlspecialchars($input['username']) ?>">
        <span class="error"><?= htmlspecialchars($errors['username'] ?? '') ?></span>

        <label for="email">Email</label>
        <input type="email" id="email" name="email" value="<?= htmlspecialchars($input['email']) ?>">
        <span class="error"><?= htmlspecialchars($errors['email'] ?? '') ?></span>

        <label for="password">Password</label>
        <input type="password" id="password" name="password">
        <span class="error"><?= htmlspecialchars($errors['password'] ?? '') ?></span>

        <label for="confirm">Confirm password</label>
        <input type="password" id="confirm" name="confirm">
        <span class="error"><?= htmlspecialchars($errors['confirm'] ?? '') ?></span>

        <button class="btn" type="submit">Register</button>
    </form>
    <p>Already have an account? <a href="<?= BASE_URL ?>/views/auth/login.php">Login</a></p>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>