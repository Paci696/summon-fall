<?php
define('APP_NAME', 'Summon Fall');
define('BASE_PATH', dirname(__DIR__));
define('BASE_URL', '/summon-fall'); // '' for http://summon-fall.test ; use '/summonfall' for http://localhost/summonfall
define('DEBUG', false);

if (DEBUG) {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
}