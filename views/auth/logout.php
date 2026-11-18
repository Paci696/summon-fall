<?php
require_once __DIR__ . '/../../includes/autoload.php';
Auth::logout();
header('Location: ' . BASE_URL . '/views/auth/login.php');
exit;