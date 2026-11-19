<?php
class Score extends Model
{
    protected static string $table = 'scores';

    public const MAPS = [1 => 'Greenfield', 2 => 'Twin Lakes', 3 => 'Stonepass', 4 => 'Frostveil'];

    private int $userId;
    private int $score;
    private int $wavesReached;
    private int $kills;
    private int $soulsEarned;
    private int $durationSec;
    private int $mapId;

    public function __construct(int $userId, int $score, int $wavesReached, int $kills, int $soulsEarned, int $durationSec, ?int $id = null, int $mapId = 1)
    {
        parent::__construct($id);
        $this->userId = $userId;
        $this->score = $score;
        $this->wavesReached = $wavesReached;
        $this->kills = $kills;
        $this->soulsEarned = $soulsEarned;
        $this->durationSec = $durationSec;
        $this->mapId = $mapId;
    }

    public function getUserId(): int { return $this->userId; }
    public function getScore(): int { return $this->score; }
    public function getWavesReached(): int { return $this->wavesReached; }
    public function getKills(): int { return $this->kills; }
    public function getSoulsEarned(): int { return $this->soulsEarned; }
    public function getDurationSec(): int { return $this->durationSec; }
    public function getMapId(): int { return $this->mapId; }
    public function getMapName(): string { return self::MAPS[$this->mapId] ?? 'Unknown'; }

    protected static function fromRow(array $row): static
    {
        return new static(
            (int) $row['user_id'], (int) $row['score'], (int) $row['waves_reached'],
            (int) $row['kills'], (int) $row['souls_earned'], (int) $row['duration_sec'],
            (int) $row['id'], (int) ($row['map_id'] ?? 1)
        );
    }

    public function save(): bool
    {
        $values = [$this->userId, $this->mapId, $this->score, $this->wavesReached, $this->kills, $this->soulsEarned, $this->durationSec];
        if ($this->getId() === null) {
            $this->db->execute(
                'INSERT INTO scores (user_id, map_id, score, waves_reached, kills, souls_earned, duration_sec) VALUES (?, ?, ?, ?, ?, ?, ?)',
                $values
            );
            $this->setId($this->db->lastInsertId());
        } else {
            $this->db->execute(
                'UPDATE scores SET user_id = ?, map_id = ?, score = ?, waves_reached = ?, kills = ?, souls_earned = ?, duration_sec = ? WHERE id = ?',
                [...$values, $this->getId()]
            );
        }
        return true;
    }

    // Validates a finished run, saves it and banks the souls (one transaction).
    public static function recordRun(User $user, array $run, int $serverDuration): Score
    {
        $int = fn(string $key): int => (isset($run[$key]) && is_numeric($run[$key])) ? (int) $run[$key] : -1;
        $score = $int('score');
        $waves = $int('waves_reached');
        $kills = $int('kills');
        $souls = $int('souls_earned');
        if ($score < 0 || $waves < 0 || $kills < 0 || $souls < 0) {
            throw new ValidationException('Run data is missing or invalid.');
        }
        $mapId = (isset($run['map_id']) && is_numeric($run['map_id'])) ? (int) $run['map_id'] : 1;
        if (!isset(self::MAPS[$mapId])) {
            throw new ValidationException('Unknown map.');
        }

        // Plausibility checks: waves need time, kills need waves, souls and score need kills.
        $adjusted = $serverDuration + 3; // small slack for timing
        $maxWaves = $adjusted >= 20 ? intdiv($adjusted - 20, 5) + 1 : 0;
        if ($waves > $maxWaves
            || $kills > 3 * $waves + $waves * $waves
            || $souls > $kills * 25
            || $score > $kills * 250 + $waves * 60) {
            throw new ValidationException('Run data looks invalid and was not saved.');
        }

        $db = Database::getInstance();
        $record = new Score($user->getId(), $score, $waves, $kills, $souls, min($serverDuration, 86400), null, $mapId);
        try {
            $db->beginTransaction();
            $record->save();
            $db->execute('UPDATE users SET souls = souls + ? WHERE id = ?', [$souls, $user->getId()]);
            $db->commit();
        } catch (DatabaseException $e) {
            $db->rollBack();
            throw $e;
        }
        return $record;
    }

    // Leaderboard rows (with player names). $sort and $period are whitelisted; $mapId 0 = all maps.
    public static function leaderboard(string $search, string $period, string $sort, int $limit = 50, int $mapId = 0): array
    {
        $columns = ['score' => 's.score', 'waves' => 's.waves_reached', 'kills' => 's.kills'];
        $orderBy = $columns[$sort] ?? 's.score';

        $where = [];
        $params = [];
        if ($search !== '') {
            $where[] = 'u.username LIKE ?';
            $params[] = '%' . $search . '%';
        }
        if ($period === 'today') {
            $where[] = 's.played_at >= CURDATE()';
        } elseif ($period === 'week') {
            $where[] = 's.played_at >= (NOW() - INTERVAL 7 DAY)';
        }
        if (isset(self::MAPS[$mapId])) {
            $where[] = 's.map_id = ?';
            $params[] = $mapId;
        }

        $sql = 'SELECT s.id, u.username, s.map_id, s.score, s.waves_reached, s.kills, s.souls_earned, s.duration_sec, s.played_at
                FROM scores s JOIN users u ON u.id = s.user_id'
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . " ORDER BY $orderBy DESC, s.id ASC LIMIT " . (int) $limit;
        return Database::getInstance()->fetchAll($sql, $params);
    }

    public static function bestFor(int $userId): array
    {
        return Database::getInstance()->fetchOne(
            'SELECT MAX(score) AS best, COUNT(*) AS runs FROM scores WHERE user_id = ?', [$userId]
        ) ?? ['best' => null, 'runs' => 0];
    }

    public static function statsFor(int $userId): array
    {
        $db = Database::getInstance();
        $row = $db->fetchOne(
            'SELECT COUNT(*) AS runs, COALESCE(MAX(score),0) AS best, COALESCE(MAX(waves_reached),0) AS best_wave,
                    COALESCE(SUM(kills),0) AS kills, COALESCE(SUM(souls_earned),0) AS souls,
                    COALESCE(SUM(duration_sec),0) AS seconds
             FROM scores WHERE user_id = ?',
            [$userId]
        );
        $rank = null;
        if ((int) $row['runs'] > 0) {
            $r = $db->fetchOne(
                'SELECT COUNT(*) + 1 AS pos FROM (SELECT MAX(score) AS m FROM scores GROUP BY user_id) t WHERE t.m > ?',
                [$row['best']]
            );
            $rank = (int) $r['pos'];
        }
        return [
            'runs' => (int) $row['runs'], 'best' => (int) $row['best'], 'bestWave' => (int) $row['best_wave'],
            'kills' => (int) $row['kills'], 'souls' => (int) $row['souls'], 'seconds' => (int) $row['seconds'],
            'rank' => $rank,
        ];
    }

    public static function recentFor(int $userId, int $limit = 10): array
    {
        return Database::getInstance()->fetchAll(
            'SELECT score, waves_reached, kills, souls_earned, duration_sec, played_at
             FROM scores WHERE user_id = ? ORDER BY played_at DESC, id DESC LIMIT ' . (int) $limit,
            [$userId]
        );
    }
}