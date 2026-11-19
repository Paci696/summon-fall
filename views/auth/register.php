<?php
require_once __DIR__ . '/../../includes/autoload.php';
Auth::startSession();

if (Auth::check()) {
    header('Location: ' . BASE_URL . '/views/menu.php');
    exit;
}

$errors = [];
$error = '';
$input = ['username' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = [
        'username' => trim($_POST['username'] ?? ''),
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
<div class="auth-stage">
    <canvas id="title-bg" aria-hidden="true"></canvas>
    <div class="auth-shade"></div>

    <form class="auth-card" method="post" autocomplete="on" novalidate>
        <div class="auth-logo"><small>endless RTS</small><h1><?= htmlspecialchars(APP_NAME) ?></h1></div>
        <h2 class="auth-title">Create your account</h2>

        <?php if ($error): ?><div class="auth-alert" role="alert"><?= htmlspecialchars($error) ?></div><?php endif; ?>
        <?= Csrf::field() ?>

        <label class="auth-field <?= !empty($errors['username']) ? 'bad' : '' ?>">
            <span>Username</span>
            <input type="text" name="username" value="<?= htmlspecialchars($input['username']) ?>" autocomplete="username" maxlength="30" autofocus>
            <em><?= htmlspecialchars($errors['username'] ?? '3-30 letters, numbers or underscores') ?></em>
        </label>

        <label class="auth-field <?= !empty($errors['password']) ? 'bad' : '' ?>">
            <span>Password</span>
            <div class="auth-pass">
                <input type="password" name="password" autocomplete="new-password">
                <button type="button" class="auth-eye" aria-label="Show password">SHOW</button>
            </div>
            <em><?= htmlspecialchars($errors['password'] ?? 'At least 6 characters') ?></em>
        </label>

        <label class="auth-field <?= !empty($errors['confirm']) ? 'bad' : '' ?>">
            <span>Confirm password</span>
            <input type="password" name="confirm" autocomplete="new-password">
            <em><?= htmlspecialchars($errors['confirm'] ?? '') ?></em>
        </label>

        <button class="auth-go" type="submit">Start your run</button>
        <p class="auth-switch">Already have an account? <a href="<?= BASE_URL ?>/views/auth/login.php">Log in</a></p>
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