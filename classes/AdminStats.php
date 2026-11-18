<?php
class AdminStats
{
    private static function count(string $sql): int
    {
        return (int) (Database::getInstance()->fetchOne($sql)['c'] ?? 0);
    }

    public static function totals(): array
    {
        $db = Database::getInstance();
        $agg = $db->fetchOne('SELECT COALESCE(MAX(score),0) AS best, COALESCE(ROUND(AVG(waves_reached),1),0) AS avg_wave,
                                     COALESCE(SUM(kills),0) AS kills, COALESCE(SUM(souls_earned),0) AS souls FROM scores');
        return [
            'players' => self::count("SELECT COUNT(*) c FROM users WHERE role = 'player'"),
            'admins'  => self::count("SELECT COUNT(*) c FROM users WHERE role = 'admin'"),
            'runs'    => self::count('SELECT COUNT(*) c FROM scores'),
            'units'   => self::count('SELECT COUNT(*) c FROM units'),
            'skills'  => self::count('SELECT COUNT(*) c FROM skills'),
            'best'    => (int) $agg['best'],
            'avgWave' => $agg['avg_wave'],
            'kills'   => (int) $agg['kills'],
            'souls'   => (int) $agg['souls'],
        ];
    }

    public static function topScores(int $limit = 5): array
    {
        return Database::getInstance()->fetchAll(
            'SELECT u.username, s.score, s.waves_reached, s.kills, s.played_at
             FROM scores s JOIN users u ON u.id = s.user_id ORDER BY s.score DESC LIMIT ' . (int) $limit
        );
    }

    public static function recentRuns(int $limit = 8): array
    {
        return Database::getInstance()->fetchAll(
            'SELECT u.username, s.score, s.waves_reached, s.kills, s.duration_sec, s.played_at
             FROM scores s JOIN users u ON u.id = s.user_id ORDER BY s.played_at DESC, s.id DESC LIMIT ' . (int) $limit
        );
    }

    // [date => runs] for the last 7 days, zero-filled
    public static function runsPerDay(): array
    {
        $rows = Database::getInstance()->fetchAll(
            'SELECT DATE(played_at) AS d, COUNT(*) AS c FROM scores
             WHERE played_at >= (CURDATE() - INTERVAL 6 DAY) GROUP BY d'
        );
        $found = array_column($rows, 'c', 'd');
        $out = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = date('Y-m-d', strtotime("-$i day"));
            $out[$day] = (int) ($found[$day] ?? 0);
        }
        return $out;
    }

    public static function searchUsers(string $q, string $role, string $sort, string $dir): array
    {
        $cols = ['id', 'username', 'email', 'role', 'souls', 'created_at', 'runs', 'best'];
        $sort = in_array($sort, $cols, true) ? $sort : 'id';
        $dir = strtolower($dir) === 'desc' ? 'DESC' : 'ASC';

        $sql = 'SELECT u.id, u.username, u.email, u.role, u.souls, u.created_at,
                       (SELECT COUNT(*) FROM scores s WHERE s.user_id = u.id) AS runs,
                       (SELECT COALESCE(MAX(s.score),0) FROM scores s WHERE s.user_id = u.id) AS best
                FROM users u WHERE 1=1';
        $params = [];
        if ($q !== '') {
            $sql .= ' AND (u.username LIKE ? OR u.email LIKE ?)';
            $params[] = "%$q%";
            $params[] = "%$q%";
        }
        if (in_array($role, ['admin', 'player'], true)) {
            $sql .= ' AND u.role = ?';
            $params[] = $role;
        }
        $sql .= " ORDER BY $sort $dir";
        return Database::getInstance()->fetchAll($sql, $params);
    }
}