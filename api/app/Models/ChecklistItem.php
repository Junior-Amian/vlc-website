<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Pièce à fournir pour un dossier.
 */
final class ChecklistItem extends Model
{
    protected string $table = 'checklist_items';

    protected array $fillable = ['dossier_id', 'label', 'help', 'required', 'status', 'rejection_reason', 'position'];

    public const STATUSES = ['missing', 'received', 'validated', 'rejected'];

    /** @return array<int, array<string, mixed>> */
    public function forDossier(string $dossierId): array
    {
        $statement = $this->db()->prepare(
            'SELECT * FROM `checklist_items` WHERE `dossier_id` = :dossier ORDER BY `position`, `id`'
        );
        $statement->execute(['dossier' => $dossierId]);

        return $statement->fetchAll();
    }

    /**
     * Une pièce, à condition qu'elle appartienne à ce dossier : les
     * identifiants envoyés par le navigateur ne sont jamais crus sur parole.
     *
     * @return array<string, mixed>|null
     */
    public function findInDossier(string $id, string $dossierId): ?array
    {
        $item = $this->find($id);

        return $item !== null && (string) $item['dossier_id'] === $dossierId ? $item : null;
    }

    public function nextPosition(string $dossierId): int
    {
        $statement = $this->db()->prepare('SELECT COALESCE(MAX(`position`), -1) + 1 FROM `checklist_items` WHERE `dossier_id` = :dossier');
        $statement->execute(['dossier' => $dossierId]);

        return (int) $statement->fetchColumn();
    }

    /**
     * Range les pièces dans l'ordre donné. Les identifiants étrangers au
     * dossier sont ignorés.
     *
     * @param string[] $ids
     */
    public function reorder(string $dossierId, array $ids): void
    {
        $statement = $this->db()->prepare(
            'UPDATE `checklist_items` SET `position` = :position WHERE `id` = :id AND `dossier_id` = :dossier'
        );

        foreach (array_values($ids) as $position => $id) {
            $statement->execute(['position' => $position, 'id' => (string) $id, 'dossier' => $dossierId]);
        }
    }
}
