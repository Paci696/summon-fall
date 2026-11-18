<?php
class AdminUser extends User
{
    public function getRole(): string { return 'admin'; }
    public function getDashboardPath(): string { return BASE_URL . '/views/admin/dashboard.php'; }
    public function canManageContent(): bool { return true; }
}