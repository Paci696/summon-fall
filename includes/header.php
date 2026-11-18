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
<header class="topbar">
    <a class="brand" href="<?= BASE_URL ?>/index.php"><?= APP_NAME ?></a>
    <nav>
        <?php if ($navUser): ?>
            <span class="who"><?= htmlspecialchars($navUser->getUsername()) ?> (<?= $navUser->getRole() ?>)</span>
            <a href="<?= BASE_URL ?>/views/menu.php">Menu</a>
            <a href="<?= BASE_URL ?>/views/profile.php">Profile</a>
            <?php if ($navUser->canManageContent()): ?>
                <a href="<?= BASE_URL ?>/views/admin/dashboard.php">Admin</a>
            <?php endif; ?>
            <a href="<?= BASE_URL ?>/views/auth/logout.php">Logout</a>
        <?php else: ?>
            <a href="<?= BASE_URL ?>/views/auth/login.php">Login</a>
            <a href="<?= BASE_URL ?>/views/auth/register.php">Register</a>
        <?php endif; ?>
    </nav>
</header>
<main class="container">