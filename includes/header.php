<?php
require_once __DIR__ . '/autoload.php';
Auth::startSession();
$navUser = Auth::user();
$cssVersion = @filemtime(BASE_PATH . '/assets/css/main.css') ?: 1;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= htmlspecialchars(($pageTitle ?? 'Home') . ' - ' . APP_NAME) ?></title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' fill='%231b1b2a'/><rect x='4' y='3' width='8' height='6' fill='%23ffcf5a'/><rect x='6' y='9' width='4' height='4' fill='%23ffcf5a'/></svg>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/main.css?v=<?= $cssVersion ?>">
</head>
<body>
<?php
$navPage = basename($_SERVER['SCRIPT_NAME']);
$navActive = fn(string ...$files) => in_array($navPage, $files, true) ? ' on' : '';
?>
<header class="topbar">
    <a class="brand" href="<?= BASE_URL ?>/<?= $navUser ? 'views/menu.php' : 'index.php' ?>">
        <i class="brand-gem"></i><span>Summon Fall</span>
    </a>
    <nav class="topnav">
        <?php if ($navUser): ?>
            <a class="nl<?= $navActive('menu.php') ?>" href="<?= BASE_URL ?>/views/menu.php">Menu</a>
            <a class="nl<?= $navActive('profile.php') ?>" href="<?= BASE_URL ?>/views/profile.php">Profile</a>
            <?php if ($navUser->canManageContent()): ?>
                <a class="nl<?= str_contains($_SERVER['SCRIPT_NAME'], '/admin/') ? ' on' : '' ?>" href="<?= BASE_URL ?>/views/admin/dashboard.php">Admin</a>
            <?php endif; ?>
            <span class="nuser" title="<?= htmlspecialchars($navUser->getRole()) ?>">
                <b class="av"><?= htmlspecialchars(strtoupper(substr($navUser->getUsername(), 0, 1))) ?></b>
                <span class="nm"><?= htmlspecialchars($navUser->getUsername()) ?></span>
                <em class="rl <?= htmlspecialchars($navUser->getRole()) ?>"><?= htmlspecialchars($navUser->getRole()) ?></em>
                <span class="sl"><i class="gem"></i><?= (int) $navUser->getSouls() ?></span>
            </span>
            <a class="nl out" href="<?= BASE_URL ?>/views/auth/logout.php">Logout</a>
        <?php else: ?>
            <a class="nl<?= $navActive('login.php') ?>" href="<?= BASE_URL ?>/views/auth/login.php">Login</a>
            <a class="nl cta<?= $navActive('register.php') ?>" href="<?= BASE_URL ?>/views/auth/register.php">Register</a>
        <?php endif; ?>
    </nav>
</header>
<main class="container">