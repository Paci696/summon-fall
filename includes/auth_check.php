<?php
require_once __DIR__ . '/autoload.php';
Auth::startSession();

if (!Auth::check()) {
    header('Location: ' . BASE_URL . '/views/auth/login.php');
    exit;
}
$currentUser = Auth::user();