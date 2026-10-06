<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Message du fil d'un dossier, écrit par le client ou par l'équipe.
 */
final class DossierMessage extends Model
{
    protected string $table = 'dossier_messages';

    protected array $fillable = ['dossier_id', 'author', 'admin_id', 'body'];

    public const MAX_LENGTH = 2000;

    /**
     * Le fil d'un dossier, du plus ancien au plus récent, avec le nom du
     * membre de l'équipe qui a écrit.
     *
     * @return array<int, array<string, mixed>>
     */
    public function forDossier(string $dossierId): array
    {
        $statement = $this->db()->prepare(
            'SELECT m.*, a.`name` AS admin_name
             FROM `dossier_messages` m
             LEFT JOIN `admins` a ON a.`id` = m.`admin_id`
             WHERE m.`dossier_id` = :dossier
             ORDER BY m.`created_at`, m.`id`'
        );
        $statement->execute(['dossier' => $dossierId]);

        return $statement->fetchAll();
    }

    /**
     * Messages de l'autre partie arrivés depuis la dernière lecture.
     *
     * @param 'client'|'team' $reader Qui lit : on compte les messages de l'autre.
     */
    public function unread(string $dossierId, string $reader, ?string $readAt): int
    {
        $statement = $this->db()->prepare(
            'SELECT COUNT(*) FROM `dossier_messages`
             WHERE `dossier_id` = :dossier AND `author` <> :reader
               AND (:read_at IS NULL OR `created_at` > :read_at2)'
        );
        $statement->execute(['dossier' => $dossierId, 'reader' => $reader, 'read_at' => $readAt, 'read_at2' => $readAt]);

        return (int) $statement->fetchColumn();
    }

    /**
     * Forme exposée. `authorName` : le prénom du membre de l'équipe pour ses
     * messages (le client sait qui lui répond), rien pour ceux du client.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function present(array $row): array
    {
        $name = $row['author'] === 'team' && $row['admin_name'] !== null
            ? explode(' ', trim((string) $row['admin_name']))[0]
            : null;

        return [
            'id'         => (string) $row['id'],
            'author'     => (string) $row['author'],
            'authorName' => $name,
            'body'       => (string) $row['body'],
            'createdAt'  => (string) $row['created_at'],
        ];
    }
}
