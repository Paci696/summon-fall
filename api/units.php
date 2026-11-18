<?php
require_once __DIR__ . '/../includes/autoload.php';

ApiResponse::requireMethod('GET');
$user = ApiResponse::requireUser();

try {
    $hero = Hero::selectedFor($user->getId());
    $heroData = $hero->toArray();
    $heroData['abilities'] = $hero->abilities();
    $heroData['equipment'] = Inventory::totals($user->getId(), $hero->getId());
    $heroData['skills'] = Skill::heroBonusesForUser($user->getId(), $hero->getId());
    ApiResponse::json([
        'player_units' => array_map(fn($u) => $u->toArray(), Unit::availableForUser($user->getId())),
        'mobs'         => array_map(fn($u) => $u->toArray(), Unit::activeByFaction('mob')),
        'bonuses'      => Skill::bonusesForUser($user->getId()),
        'loadout'      => Loadout::idsFor($user->getId()),
        'souls'        => $user->getSouls(),
        'hero'         => $heroData,
        'items'        => Item::catalog(),
    ]);
} catch (DatabaseException $e) {
    ApiResponse::fail(DEBUG ? $e->getMessage() : 'Server error.', 500);
}