<?php
require_once __DIR__ . '/../config/config.php';

spl_autoload_register(function (string $class): void {
    $dirs = [BASE_PATH . '/classes/', BASE_PATH . '/classes/exceptions/'];
    foreach ($dirs as $dir) {
        $file = $dir . $class . '.php';
        if (is_file($file)) {
            require_once $file;
            return;
        }
    }
});