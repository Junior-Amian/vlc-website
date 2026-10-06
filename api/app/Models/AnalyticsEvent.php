<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Événements de mesure d'audience (voir analytics_events dans schema.sql).
 *
 * Toutes les périodes sont exprimées en dates UTC (heure d'Abidjan), bornes
 * comprises : du jour $from à 00:00 au jour $to à 23:59:59.
 */
final class AnalyticsEvent extends Model
{
    protected string $table = 'analytics_events';

    protected array $fillable = ['type', 'name', 'visitor', 'referrer', 'device'];

    /** Durée de conservation : au-delà, les lignes sont effacées. */
    private const RETENTION_MONTHS = 13;

    /** Plafond d'événements par visiteur et par jour, contre le remplissage abusif. */
    private const DAILY_CAP = 500;

    /** @param array<int, array{type: string, name: string, referrer: ?string}> $events */
    public function record(array $events, string $visitor, string $device): void
    {
        if ($events === [] || $this->countToday($visitor) >= self::DAILY_CAP) {
            return;
        }

        $statement = $this->db()->prepare(
            'INSERT INTO `analytics_events` (`type`, `name`, `visitor`, `referrer`, `device`)
             VALUES (:type, :name, :visitor, :referrer, :device)'
        );

        foreach ($events as $event) {
            $statement->execute([...$event, 'visitor' => $visitor, 'device' => $device]);
        }

        // Purge opportuniste, une fois sur deux cents en moyenne.
        if (random_int(1, 200) === 1) {
            $this->db()->exec(
                'DELETE FROM `analytics_events` WHERE `created_at` < NOW() - INTERVAL ' . self::RETENTION_MONTHS . ' MONTH'
            );
        }
    }

    private function countToday(string $visitor): int
    {
        $statement = $this->db()->prepare(
            'SELECT COUNT(*) FROM `analytics_events` WHERE `visitor` = :visitor AND `created_at` >= CURDATE()'
        );
        $statement->execute(['visitor' => $visitor]);

        return (int) $statement->fetchColumn();
    }

    /** @return array{visitors: int, pageviews: int, contacts: int, contactVisitors: int} */
    public function totals(string $from, string $to): array
    {
        $row = $this->query(
            "SELECT COUNT(DISTINCT `visitor`) AS visitors,
                    SUM(`type` = 'pageview') AS pageviews,
                    SUM(`type` = 'action') AS contacts,
                    COUNT(DISTINCT CASE WHEN `type` = 'action' THEN `visitor` END) AS contactVisitors
             FROM `analytics_events`
             WHERE `created_at` BETWEEN :from AND :to",
            $from,
            $to
        )[0] ?? [];

        return [
            'visitors'        => (int) ($row['visitors'] ?? 0),
            'pageviews'       => (int) ($row['pageviews'] ?? 0),
            'contacts'        => (int) ($row['contacts'] ?? 0),
            'contactVisitors' => (int) ($row['contactVisitors'] ?? 0),
        ];
    }

    /** @return array<string, array{visitors: int, pageviews: int}> Indexé par date (AAAA-MM-JJ). */
    public function daily(string $from, string $to): array
    {
        $rows = $this->query(
            "SELECT DATE(`created_at`) AS day,
                    COUNT(DISTINCT `visitor`) AS visitors,
                    SUM(`type` = 'pageview') AS pageviews
             FROM `analytics_events`
             WHERE `created_at` BETWEEN :from AND :to
             GROUP BY DATE(`created_at`)",
            $from,
            $to
        );

        $days = [];

        foreach ($rows as $row) {
            $days[(string) $row['day']] = ['visitors' => (int) $row['visitors'], 'pageviews' => (int) $row['pageviews']];
        }

        return $days;
    }

    /**
     * Décompte par valeur d'une colonne pour un type d'événement.
     *
     * @param 'name'|'referrer'|'device' $column
     * @param bool                       $distinct Compter les visiteurs plutôt que les événements.
     * @return array<string, int> Valeur => nombre, du plus grand au plus petit.
     */
    public function countBy(string $type, string $column, string $from, string $to, bool $distinct = false, int $limit = 20): array
    {
        // Liste blanche : un nom de colonne ne peut pas être un paramètre lié.
        if (!in_array($column, ['name', 'referrer', 'device'], true)) {
            throw new \InvalidArgumentException("Colonne non autorisée : {$column}");
        }

        $measure = $distinct ? 'COUNT(DISTINCT `visitor`)' : 'COUNT(*)';
        $limit = max(1, min($limit, 50));

        $rows = $this->query(
            "SELECT `{$column}` AS label, {$measure} AS total
             FROM `analytics_events`
             WHERE `type` = :type AND `created_at` BETWEEN :from AND :to
             GROUP BY `{$column}`
             ORDER BY total DESC
             LIMIT {$limit}",
            $from,
            $to,
            ['type' => $type]
        );

        $counts = [];

        foreach ($rows as $row) {
            $counts[(string) ($row['label'] ?? '')] = (int) $row['total'];
        }

        return $counts;
    }

    public function lastEventAt(): ?string
    {
        $value = $this->db()->query('SELECT MAX(`created_at`) FROM `analytics_events`')->fetchColumn();

        return $value === false || $value === null ? null : (string) $value;
    }

    /**
     * @param array<string, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    private function query(string $sql, string $from, string $to, array $params = []): array
    {
        $statement = $this->db()->prepare($sql);
        $statement->execute([...$params, 'from' => $from . ' 00:00:00', 'to' => $to . ' 23:59:59']);

        return $statement->fetchAll();
    }
}
