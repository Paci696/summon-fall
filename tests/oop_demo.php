<?php
require_once __DIR__ . '/../includes/autoload.php';
header('Content-Type: text/plain; charset=utf-8');

try {
    echo "== Units: same method, different behaviour (polymorphism) ==\n";
    foreach (Unit::all() as $u) {
        printf("%-14s %-14s %-8s %s\n", $u->getName(), $u->getRole(), $u->getAttackType(), get_class($u));
    }

    echo "\n== Inheritance and abstraction ==\n";
    $s = Unit::find(2);
    echo $s->describe() . "\n";
    echo 'Swordsman is a Unit: ' . var_export($s instanceof Unit, true) . "\n";
    echo 'Swordsman is a Model: ' . var_export($s instanceof Model, true) . "\n";
    echo 'Swordsman is Crudable: ' . var_export($s instanceof Crudable, true) . "\n";

    echo "\n== Users: roles override the same methods ==\n";
    $hash = password_hash('demo123', PASSWORD_DEFAULT);
    foreach ([new AdminUser('demo_admin', 'a@x.com', $hash), new PlayerUser('demo_player', 'p@x.com', $hash)] as $user) {
        printf("%-12s role=%-7s dashboard=%-28s manages content=%s\n",
            $user->getUsername(), $user->getRole(), $user->getDashboardPath(), $user->canManageContent() ? 'yes' : 'no');
    }

    echo "\n== Exception handling ==\n";
    try {
        new PlayerUser('x!', 'bad-email', $hash);
    } catch (ValidationException $e) {
        echo 'Caught ValidationException: ' . $e->getMessage() . "\n";
    }
} catch (DatabaseException $e) {
    echo 'Database error: ' . $e->getMessage();
}