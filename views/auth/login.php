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
<div class="auth-stage">
    <canvas id="title-bg" aria-hidden="true"></canvas>
    <div class="auth-shade"></div>

    <form class="auth-card" method="post" autocomplete="on">
        <div class="auth-logo"><small>endless RTS</small><h1><?= htmlspecialchars(APP_NAME) ?></h1></div>
        <h2 class="auth-title">Welcome back</h2>

        <?php if ($error): ?><div class="auth-alert" role="alert"><?= htmlspecialchars($error) ?></div><?php endif; ?>
        <?= Csrf::field() ?>

        <label class="auth-field">
            <span>Username</span>
            <input type="text" name="username" value="<?= htmlspecialchars($username) ?>" autocomplete="username" required autofocus>
        </label>

        <label class="auth-field">
            <span>Password</span>
            <div class="auth-pass">
                <input type="password" name="password" autocomplete="current-password" required>
                <button type="button" class="auth-eye" aria-label="Show password">SHOW</button>
            </div>
        </label>

        <button class="auth-go" type="submit">Enter the fall</button>
        <p class="auth-switch">No account? <a href="<?= BASE_URL ?>/views/auth/register.php">Create one</a></p>
    </form>
</div>
<script>
document.querySelectorAll('.auth-eye').forEach(function (b) {
    b.addEventListener('click', function () {
        var i = b.parentNode.querySelector('input');
        var show = i.type === 'password';
        i.type = show ? 'text' : 'password';
        b.textContent = show ? 'HIDE' : 'SHOW';
    });
});
</script>
<script type="module" src="<?= BASE_URL ?>/assets/js/game/menu.js?v=<?= @filemtime(BASE_PATH . '/assets/js/game/menu.js') ?: 1 ?>"></script>
<?php require __DIR__ . '/../../includes/footer.php'; ?>