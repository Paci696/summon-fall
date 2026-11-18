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
    ApiResponse::json(['ok' => true, 'score' => $record->getScore(), 'souls_banked' => $record->getSoulsEarned(), 'items' => $items]);
} catch (ValidationException $e) {
    ApiResponse::fail($e->getMessage(), 422);
} catch (DatabaseException $e) {
    ApiResponse::fail(DEBUG ? $e->getMessage() : 'Server error.', 500);
}