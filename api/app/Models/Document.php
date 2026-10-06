<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;
use App\Core\Uuid;

/**
 * Fichier déposé pour une pièce d'un dossier (voir App\Dossiers\DocumentStore).
 */
final class Document extends Model
{
    protected string $table = 'documents';

    protected array $fillable = ['checklist_item_id', 'original_name', 'stored_name', 'mime', 'size'];

    /**
     * Les fichiers des pièces d'un dossier, rangés par pièce.
     *
     * @return array<string, array<int, array<string, mixed>>>
     */
    public function forDossier(string $dossierId): array
    {
        $statement = $this->db()->prepare(
            'SELECT f.* FROM `documents` f
             JOIN `checklist_items` i ON i.`id` = f.`checklist_item_id`
             WHERE i.`dossier_id` = :dossier
             ORDER BY f.`created_at`, f.`id`'
        );
        $statement->execute(['dossier' => $dossierId]);

        $byItem = [];

        foreach ($statement->fetchAll() as $row) {
            $byItem[(string) $row['checklist_item_id']][] = $row;
        }

        return $byItem;
    }

    /** @return array<int, array<string, mixed>> */
    public function forItem(string $itemId): array
    {
        $statement = $this->db()->prepare('SELECT * FROM `documents` WHERE `checklist_item_id` = :item ORDER BY `created_at`, `id`');
        $statement->execute(['item' => $itemId]);

        return $statement->fetchAll();
    }

    /**
     * Un fichier avec ce qu'il faut pour vérifier à qui il appartient : le
     * dossier, son client, et l'état de la pièce.
     *
     * @return array<string, mixed>|null
     */
    public function findWithOwner(string $id): ?array
    {
        if (!Uuid::isValid($id)) {
            return null;
        }

        $statement = $this->db()->prepare(
            'SELECT f.*, i.`dossier_id`, i.`status` AS item_status, d.`client_id`
             FROM `documents` f
             JOIN `checklist_items` i ON i.`id` = f.`checklist_item_id`
             JOIN `dossiers` d ON d.`id` = i.`dossier_id`
             WHERE f.`id` = :id'
        );
        $statement->execute(['id' => $id]);

        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    /** @param array<string, mixed> $row */
    public static function present(array $row): array
    {
        return [
            'id'        => (string) $row['id'],
            'name'      => (string) $row['original_name'],
            'mime'      => (string) $row['mime'],
            'size'      => (int) $row['size'],
            'createdAt' => (string) $row['created_at'],
        ];
    }
}
