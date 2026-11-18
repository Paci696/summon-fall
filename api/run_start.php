<?php
require_once __DIR__ . '/../includes/autoload.php';

ApiResponse::requireMethod('POST');
ApiResponse::requireUser();
ApiResponse::requireCsrf();

$_SESSION['run_started_at'] = time();
ApiResponse::json(['ok' => true]);