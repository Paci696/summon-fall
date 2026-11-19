<?php
require_once __DIR__ . '/../includes/autoload.php';

ApiResponse::requireMethod('POST');
$user = ApiResponse::requireUser();
ApiResponse::requireCsrf();
$input = ApiResponse::body();

$started = $_SESSION['run_started_at'] ?? null;
if (!$started) {
    ApiResponse::fail('No active run to save.', 400);
}
unset($_SESSION['run_started_at']);

try {
    $record = Score::recordRun($user, $input, time() - (int) $started);
    $items = [];
    if (!empty($input['drops']) && is_array($input['drops'])) {
        $items = Inventory::recordDrops($user->getId(), $input['drops'], $record->getKills(), $record->getWavesReached(), (int) ($input['boss_kills'] ?? 0));
    }
    // hero levelling: the hero you played with earns XP from this run
    $hero = null;
    try {
        $h = Hero::selectedFor($user->getId());
        $hero = HeroLevel::award($user->getId(), $h->getId(), HeroLevel::xpForRun($record->getScore(), $record->getKills(), $record->getWavesReached()));
        $hero['name'] = $h->getName();
    } catch (Throwable $e) { /* levelling is optional: never block saving the run */ }
    ApiResponse::json(['ok' => true, 'score' => $record->getScore(), 'souls_banked' => $record->getSoulsEarned(), 'items' => $items, 'hero' => $hero]);
} catch (ValidationException $e) {
    ApiResponse::fail($e->getMessage(), 422);
} catch (DatabaseException $e) {
    ApiResponse::fail(DEBUG ? $e->getMessage() : 'Server error.', 500);
}