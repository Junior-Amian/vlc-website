<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Une section du site (bannière, prestations…) et son document JSON.
 *
 * La clé primaire est textuelle (section_key) : les méthodes génériques de
 * Model, prévues pour un identifiant entier, ne servent pas ici.
 */
final class ContentSection extends Model
{
    protected string $table = 'content_sections';

    protected string $primaryKey = 'section_key';

    /**
     * @return array<string, array{data: array<string, mixed>, version: int, updated_at: string, updated_by: ?string}>
     */
    public function allByKey(): array
    {
        $rows = $this->db()->query(
            'SELECT s.`section_key`, s.`data`, s.`version`, s.`updated_at`, a.`name` AS `updated_by`
             FROM `content_sections` s
             LEFT JOIN `admins` a ON a.`id` = s.`updated_by`'
        )->fetchAll();

        $sections = [];

        foreach ($rows as $row) {
            $sections[(string) $row['section_key']] = self::hydrate($row);
        }

        return $sections;
    }

    /** @return array{data: array<string, mixed>, version: int, updated_at: string, updated_by: ?string}|null */
    public function findByKey(string $key): ?array
    {
        $statement = $this->db()->prepare(
            'SELECT s.`section_key`, s.`data`, s.`version`, s.`updated_at`, a.`name` AS `updated_by`
             FROM `content_sections` s
             LEFT JOIN `admins` a ON a.`id` = s.`updated_by`
             WHERE s.`section_key` = :key'
        );
        $statement->execute(['key' => $key]);

        $row = $statement->fetch();

        return $row === false ? null : self::hydrate($row);
    }

    /**
     * Enregistre la section si sa version n'a pas bougé depuis la lecture.
     *
     * @param array<string, mixed> $data
     * @return int|null La nouvelle version, ou null si la section a été
     *                  modifiée entre-temps (conflit).
     */
    public function save(string $key, array $data, int $expectedVersion, string $adminId): ?int
    {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

        if ($expectedVersion === 0) {
            // Première écriture de cette section : INSERT IGNORE échoue en
            // silence si quelqu'un l'a créée entre-temps, ce qui revient à un conflit.
            $statement = $this->db()->prepare(
                'INSERT IGNORE INTO `content_sections` (`section_key`, `data`, `version`, `updated_by`)
                 VALUES (:key, :data, 1, :admin)'
            );
            $statement->execute(['key' => $key, 'data' => $json, 'admin' => $adminId]);

            return $statement->rowCount() === 1 ? 1 : null;
        }

        $statement = $this->db()->prepare(
            'UPDATE `content_sections`
             SET `data` = :data, `version` = `version` + 1, `updated_by` = :admin
             WHERE `section_key` = :key AND `version` = :version'
        );
        $statement->execute(['key' => $key, 'data' => $json, 'admin' => $adminId, 'version' => $expectedVersion]);

        return $statement->rowCount() === 1 ? $expectedVersion + 1 : null;
    }

    /**
     * Prestations du site, pour les listes de choix (témoignages, dossiers).
     * Les prestations masquées restent proposées : un témoignage ou un
     * dossier peut les citer.
     *
     * @return array<int, array{value: string, label: string}>
     */
    public function serviceOptions(): array
    {
        $services = $this->findByKey('services')['data']['items'] ?? [];
        $options = [];

        foreach (is_array($services) ? $services : [] as $service) {
            if (is_array($service) && isset($service['slug'], $service['title'])) {
                $options[] = ['value' => (string) $service['slug'], 'label' => (string) $service['title']];
            }
        }

        return $options;
    }

    /**
     * @param array<string, mixed> $row
     * @return array{data: array<string, mixed>, version: int, updated_at: string, updated_by: ?string}
     */
    private static function hydrate(array $row): array
    {
        $data = json_decode((string) $row['data'], true);

        return [
            'data'       => is_array($data) ? $data : [],
            'version'    => (int) $row['version'],
            'updated_at' => (string) $row['updated_at'],
            'updated_by' => $row['updated_by'] !== null ? (string) $row['updated_by'] : null,
        ];
    }
}
