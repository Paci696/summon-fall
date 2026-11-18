<?php
class PlayerUser extends User
{
    public function getRole(): string { return 'player'; }
    public function getDashboardPath(): string { return BASE_URL . '/views/menu.php'; }
    public function canManageContent(): bool { return false; }
}