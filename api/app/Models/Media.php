<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;
use App\Core\Uuid;

/**
 * Image de la médiathèque, en plusieurs largeurs.
 *
 * `variants` est un tableau JSON de { w, file }, du plus étroit au plus
 * large ; `file` est relatif à public/uploads.
 */
final class Media extends Model
{
    protected string $table = 'media';

    protected array $fillable = ['original_name', 'alt', 'width', 'height', 'variants', 'size', 'created_by'];

    /** Dossier public des fichiers envoyés, relatif à la racine publique de l'API. */
    public const PUBLIC_DIR = 'uploads';

    public static function directory(): string
    {
        return BASE_PATH . '/public/' . self::PUBLIC_DIR;
    }

    /**
     * @param string[] $ids
     * @return array<string, array<string, mixed>> Médias indexés par identifiant.
     */
    public function findMany(array $ids): array
    {
        $ids = array_values(array_unique(array_filter($ids, [Uuid::class, 'isValid'])));

        if ($ids === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $statement = $this->db()->prepare("SELECT * FROM `media` WHERE `id` IN ({$placeholders})");
        $statement->execute($ids);

        $found = [];

        foreach ($statement->fetchAll() as $row) {
            $found[(string) $row['id']] = $row;
        }

        return $found;
    }

    /**
     * Forme publique d'une image : celle que le site et le panel affichent.
     *
     * @param array<string, mixed> $row
     * @return array{id: string, alt: string, width: int, height: int, variants: array<int, array{w: int, src: string}>}
     */
    public static function present(array $row): array
    {
        $variants = json_decode((string) $row['variants'], true);

        return [
            'id'       => (string) $row['id'],
            'alt'      => (string) $row['alt'],
            'width'    => (int) $row['width'],
            'height'   => (int) $row['height'],
            'variants' => array_map(
                static fn (array $variant): array => [
                    'w'   => (int) $variant['w'],
                    'src' => self::PUBLIC_DIR . '/' . $variant['file'],
                ],
                is_array($variants) ? $variants : []
            ),
        ];
    }
}
