<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;
use PDO;

/**
 * Demande envoyée par le formulaire de contact du site.
 */
final class ContactRequest extends Model
{
    protected string $table = 'contact_requests';

    protected array $fillable = ['full_name', 'email', 'phone', 'message', 'status', 'note', 'email_sent', 'handled_by'];

    public const STATUSES = ['new', 'in_progress', 'done', 'spam'];

    /**
     * Filtres de la liste du panel. « open » réunit ce qui reste à faire.
     *
     * @var array<string, string[]>
     */
    public const FILTERS = [
        'open' => ['new', 'in_progress'],
        'done' => ['done'],
        'spam' => ['spam'],
        'all'  => ['new', 'in_progress', 'done'],
    ];

    /**
     * Une page de la liste, la plus récente d'abord.
     *
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    public function search(string $filter, string $query, int $page, int $perPage): array
    {
        $statuses = self::FILTERS[$filter] ?? self::FILTERS['open'];
        $placeholders = implode(', ', array_map(static fn (int $i): string => ":s{$i}", array_keys($statuses)));

        $where = "r.`status` IN ({$placeholders})";
        $params = [];

        foreach ($statuses as $i => $status) {
            $params["s{$i}"] = $status;
        }

        if ($query !== '') {
            $where .= ' AND (r.`full_name` LIKE :q OR r.`email` LIKE :q2 OR r.`phone` LIKE :q3 OR r.`message` LIKE :q4)';
            $like = '%' . addcslashes($query, '%_\\') . '%';
            $params += ['q' => $like, 'q2' => $like, 'q3' => $like, 'q4' => $like];
        }

        $count = $this->db()->prepare("SELECT COUNT(*) FROM `contact_requests` r WHERE {$where}");
        $count->execute($params);

        $statement = $this->db()->prepare(
            "SELECT r.*, a.`name` AS handled_by_name
             FROM `contact_requests` r
             LEFT JOIN `admins` a ON a.`id` = r.`handled_by`
             WHERE {$where}
             ORDER BY r.`created_at` DESC, r.`id` DESC
             LIMIT :limit OFFSET :offset"
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value);
        }

        $statement->bindValue('limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue('offset', ($page - 1) * $perPage, PDO::PARAM_INT);
        $statement->execute();

        return ['items' => $statement->fetchAll(), 'total' => (int) $count->fetchColumn()];
    }

    /** @return array<string, mixed>|null */
    public function findWithHandler(string $id): ?array
    {
        $statement = $this->db()->prepare(
            'SELECT r.*, a.`name` AS handled_by_name
             FROM `contact_requests` r
             LEFT JOIN `admins` a ON a.`id` = r.`handled_by`
             WHERE r.`id` = :id'
        );
        $statement->execute(['id' => $id]);

        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    /** @return array<string, int> Nombre de demandes par état. */
    public function counts(): array
    {
        $counts = array_fill_keys(self::STATUSES, 0);

        foreach ($this->db()->query('SELECT `status`, COUNT(*) AS total FROM `contact_requests` GROUP BY `status`') as $row) {
            $counts[(string) $row['status']] = (int) $row['total'];
        }

        return $counts;
    }

    /**
     * Forme exposée au panel.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function present(array $row): array
    {
        return [
            'id'        => (string) $row['id'],
            'fullName'  => (string) $row['full_name'],
            'email'     => (string) $row['email'],
            'phone'     => (string) $row['phone'],
            'message'   => (string) $row['message'],
            'status'    => (string) $row['status'],
            'note'      => (string) ($row['note'] ?? ''),
            'emailSent' => (bool) $row['email_sent'],
            'handledBy' => isset($row['handled_by_name']) ? (string) $row['handled_by_name'] : null,
            'createdAt' => (string) $row['created_at'],
            'updatedAt' => (string) $row['updated_at'],
        ];
    }
}
