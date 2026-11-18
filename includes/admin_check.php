<?php
require_once __DIR__ . '/auth_check.php';

if (!$currentUser->canManageContent()) {
    http_response_code(403);
    $pageTitle = 'Access denied';
    require __DIR__ . '/header.php';
    echo '<div class="card"><h1>Access denied</h1><p>This area is for admins only.</p>'
       . '<a class="btn" href="' . BASE_URL . '/views/menu.php">Back to menu</a></div>';
    require __DIR__ . '/footer.php';
    exit;
}