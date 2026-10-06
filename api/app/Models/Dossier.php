<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;
use App\Dossiers\Process;

/**
 * Dossier de visa d'un client.
 */
final class Dossier extends Model
{
    protected string $table = 'dossiers';

    protected array $fillable = [
        'client_id', 'service', 'country', 'step', 'step_changed_at', 'amount_total', 'note',
        'contact_request_id', 'created_by',
    ];

    /**
     * Filtres de la liste du panel. « review » : des pièces reçues attendent
     * d'être vérifiées ; « messages » : le client a écrit et personne n'a lu.
     */
    public const FILTERS = ['open', 'review', 'messages', 'closed', 'all'];

    /** Des pièces attendent d'être vérifiées. */
    private const HAS_REVIEW = 'EXISTS (SELECT 1 FROM `checklist_items` i WHERE i.`dossier_id` = d.`id` AND i.`status` = \'received\')';

    /** Le client a écrit depuis la dernière lecture de l'équipe. */
    private const HAS_UNREAD = 'EXISTS (SELECT 1 FROM `dossier_messages` m WHERE m.`dossier_id` = d.`id` AND m.`author` = \'client\'
        AND (d.`team_read_at` IS NULL OR m.`created_at` > d.`team_read_at`))';

    /** Colonnes de synthèse communes à la liste et à la fiche. */
    private const SUMMARY = '
        d.*, c.`full_name`, c.`email`, c.`phone`, c.`onboarded_at`,
        (c.`password_hash` IS NOT NULL) AS client_active,
        (SELECT COUNT(*) FROM `checklist_items` i WHERE i.`dossier_id` = d.`id` AND i.`required` = 1) AS items_required,
        (SELECT COUNT(*) FROM `checklist_items` i WHERE i.`dossier_id` = d.`id` AND i.`required` = 1 AND i.`status` = \'validated\') AS items_validated,
        (SELECT COUNT(*) FROM `checklist_items` i WHERE i.`dossier_id` = d.`id` AND i.`status` = \'received\') AS items_to_review,
        (SELECT COUNT(*) FROM `dossier_messages` m WHERE m.`dossier_id` = d.`id` AND m.`author` = \'client\'
            AND (d.`team_read_at` IS NULL OR m.`created_at` > d.`team_read_at`)) AS unread_messages,
        (SELECT COALESCE(SUM(p.`amount`), 0) FROM `dossier_payments` p WHERE p.`dossier_id` = d.`id`) AS paid';

    /**
     * Liste du panel, la plus récemment active d'abord. Le volume d'une
     * agence (quelques centaines de dossiers) ne justifie pas de pagination.
     *
     * @param int|null $step Ne garder que les dossiers à cette étape.
     * @return array<int, array<string, mixed>>
     */
    public function search(string $filter, string $query, ?int $step = null): array
    {
        $conditions = [
            'open'     => 'd.`step` < :last',
            'closed'   => 'd.`step` >= :last',
            'review'   => self::HAS_REVIEW,
            'messages' => self::HAS_UNREAD,
        ];

        $where = [$conditions[$filter] ?? '1 = 1'];
        $params = str_contains($where[0], ':last') ? ['last' => Process::last()] : [];

        if ($step !== null) {
            $where[] = 'd.`step` = :step';
            $params['step'] = $step;
        }

        if ($query !== '') {
            $where[] = '(c.`full_name` LIKE :q OR c.`email` LIKE :q2 OR c.`phone` LIKE :q3 OR d.`country` LIKE :q4)';
            $like = '%' . addcslashes($query, '%_\\') . '%';
            $params += ['q' => $like, 'q2' => $like, 'q3' => $like, 'q4' => $like];
        }

        $statement = $this->db()->prepare(
            'SELECT ' . self::SUMMARY . '
             FROM `dossiers` d
             JOIN `clients` c ON c.`id` = d.`client_id`
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY d.`updated_at` DESC, d.`id` DESC
             LIMIT 300'
        );
        $statement->execute($params);

        return $statement->fetchAll();
    }

    /**
     * Vue d'ensemble de tous les dossiers, pour l'en-tête de la liste du
     * panel : nombre par filtre et par étape, invitations en attente, et ce
     * qui reste à encaisser sur les dossiers en cours.
     *
     * @return array{counts: array<string, int>, byStep: array<int, int>, pendingInvitations: int, outstanding: int}
     */
    public function overview(): array
    {
        $statement = $this->db()->prepare(
            'SELECT
                COUNT(*) AS total,
                COALESCE(SUM(d.`step` < :last), 0) AS open_count,
                COALESCE(SUM(' . self::HAS_REVIEW . '), 0) AS review_count,
                COALESCE(SUM(' . self::HAS_UNREAD . '), 0) AS messages_count,
                COALESCE(SUM(c.`password_hash` IS NULL), 0) AS pending_invitations,
                COALESCE(SUM(CASE WHEN d.`step` < :last2 AND d.`amount_total` IS NOT NULL THEN GREATEST(0, CAST(d.`amount_total` AS SIGNED)
                    - (SELECT COALESCE(SUM(p.`amount`), 0) FROM `dossier_payments` p WHERE p.`dossier_id` = d.`id`)) ELSE 0 END), 0) AS outstanding
             FROM `dossiers` d
             JOIN `clients` c ON c.`id` = d.`client_id`'
        );
        $statement->execute(['last' => Process::last(), 'last2' => Process::last()]);
        $row = $statement->fetch() ?: [];

        $byStep = array_fill_keys(array_keys(Process::STEPS), 0);

        foreach ($this->db()->query('SELECT `step`, COUNT(*) AS total FROM `dossiers` GROUP BY `step`') as $line) {
            $byStep[(int) $line['step']] = (int) $line['total'];
        }

        $total = (int) ($row['total'] ?? 0);
        $open = (int) ($row['open_count'] ?? 0);

        return [
            'counts' => [
                'open'     => $open,
                'review'   => (int) ($row['review_count'] ?? 0),
                'messages' => (int) ($row['messages_count'] ?? 0),
                'closed'   => $total - $open,
                'all'      => $total,
            ],
            'byStep'             => $byStep,
            'pendingInvitations' => (int) ($row['pending_invitations'] ?? 0),
            'outstanding'        => (int) ($row['outstanding'] ?? 0),
        ];
    }

    /**
     * Dossiers qui demandent l'attention de l'équipe (pièce à vérifier ou
     * message non lu) : le badge du menu du panel.
     */
    public function attentionCount(): int
    {
        return (int) $this->db()->query(
            'SELECT COUNT(*) FROM `dossiers` d WHERE ' . self::HAS_REVIEW . ' OR ' . self::HAS_UNREAD
        )->fetchColumn();
    }

    /** Le client ou l'équipe vient de lire les messages du dossier. */
    public function markRead(string $id, string $reader): void
    {
        $column = $reader === 'client' ? 'client_read_at' : 'team_read_at';

        $this->db()
            ->prepare("UPDATE `dossiers` SET `{$column}` = NOW(3), `updated_at` = `updated_at` WHERE `id` = :id")
            ->execute(['id' => $id]);
    }

    /**
     * Réserve l'envoi d'un email qui ne doit pas partir plus d'une fois par
     * période (dépôts en rafale). Atomique : deux dépôts simultanés ne
     * peuvent pas obtenir tous deux le feu vert.
     *
     * @param 'receipt_notified_at'|'upload_notified_at' $column
     */
    public function claimNotification(string $id, string $column, int $seconds): bool
    {
        if (!in_array($column, ['receipt_notified_at', 'upload_notified_at'], true)) {
            return false;
        }

        $statement = $this->db()->prepare(
            "UPDATE `dossiers` SET `{$column}` = NOW(), `updated_at` = `updated_at`
             WHERE `id` = :id AND (`{$column}` IS NULL OR `{$column}` < NOW() - INTERVAL :seconds SECOND)"
        );
        $statement->bindValue('id', $id);
        $statement->bindValue('seconds', $seconds, \PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() === 1;
    }

    /** @return array<string, mixed>|null */
    public function findWithSummary(string $id): ?array
    {
        $statement = $this->db()->prepare(
            'SELECT ' . self::SUMMARY . '
             FROM `dossiers` d
             JOIN `clients` c ON c.`id` = d.`client_id`
             WHERE d.`id` = :id'
        );
        $statement->execute(['id' => $id]);

        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    /**
     * Dossier d'un client. Un seul pour l'instant ; plusieurs dossiers par
     * client sont prévus plus tard (V2) : le plus récent est alors affiché.
     *
     * @return array<string, mixed>|null
     */
    public function findForClient(string $clientId): ?array
    {
        $statement = $this->db()->prepare(
            'SELECT * FROM `dossiers` WHERE `client_id` = :client ORDER BY `number` DESC LIMIT 1'
        );
        $statement->execute(['client' => $clientId]);

        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    /** Marque une activité sur le dossier (dépôt d'une pièce…), pour l'ordre de la liste. */
    public function touch(string $id): void
    {
        $this->db()->prepare('UPDATE `dossiers` SET `updated_at` = NOW() WHERE `id` = :id')->execute(['id' => $id]);
    }

    /**
     * Référence à communiquer au client : VLC-2026-0042. Tirée du numéro
     * d'ordre du dossier (colonne `number`), l'identifiant étant un UUID.
     */
    public static function reference(array $dossier): string
    {
        return sprintf('VLC-%s-%04d', substr((string) $dossier['created_at'], 0, 4), (int) $dossier['number']);
    }
}
