<?php
require_once __DIR__ . '/includes/autoload.php';
Auth::startSession();

$target = Auth::check() ? '/views/menu.php' : '/views/auth/login.php';
header('Location: ' . BASE_URL . $target);
exit;