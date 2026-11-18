<?php
require_once __DIR__ . '/../../includes/autoload.php';

echo '<h2>' . APP_NAME . ' - DB check</h2>';
try {
    $db = Database::getInstance();
    echo '<p>Connected. MySQL ' . $db->fetchOne('SELECT VERSION() AS v')['v'] . '</p><ul>';
    foreach (['users', 'units', 'skills', 'player_skills', 'scores'] as $table) {
        $n = $db->fetchOne("SELECT COUNT(*) AS n FROM $table")['n'];
        echo "<li>$table: $n rows</li>";
    }
    echo '</ul>';
} catch (DatabaseException $e) {
    echo '<p style="color:red">' . htmlspecialchars($e->getMessage()) . '</p>';
}