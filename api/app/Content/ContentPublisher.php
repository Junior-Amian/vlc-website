<?php

declare(strict_types=1);

namespace App\Content;

use App\Core\Uuid;
use App\Models\ContentSection;
use App\Models\Media;

/**
 * Assemble le contenu public du site à partir des sections enregistrées.
 *
 * Par rapport aux données du panel :
 * - les éléments masqués (`published: false`) sont retirés, et la clé
 *   `published` avec eux ;
 * - les identifiants d'images sont remplacés par l'image elle-même (largeurs
 *   disponibles, texte alternatif).
 *
 * Le résultat est mis en cache sur disque : il ne change qu'à l'enregistrement
 * d'une section ou d'un média, alors qu'il est lu à chaque visite du site.
 */
final class ContentPublisher
{
    private const CACHE_FILE = '/storage/cache/content.json';

    /** Contenu public encodé en JSON, servi tel quel par GET /content. */
    public function json(): string
    {
        $file = BASE_PATH . self::CACHE_FILE;

        if (is_file($file)) {
            $cached = file_get_contents($file);

            if ($cached !== false && $cached !== '') {
                return $cached;
            }
        }

        $json = json_encode(
            $this->build(),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        );

        $this->write($file, $json);

        return $json;
    }

    /** À appeler après toute modification d'une section ou d'un média. */
    public function invalidate(): void
    {
        @unlink(BASE_PATH . self::CACHE_FILE);
    }

    /**
     * Sections qui utilisent chaque image, pour empêcher de supprimer une
     * image encore affichée sur le site.
     *
     * @return array<string, string[]> Identifiant du média => libellés des sections.
     */
    public function mediaUsage(): array
    {
        $usage = [];

        foreach ((new ContentSection())->allByKey() as $key => $section) {
            $definition = ContentSchema::section($key);

            if ($definition === null) {
                continue;
            }

            foreach (self::imageIds($definition['fields'], $section['data']) as $id) {
                $usage[$id][] = $definition['label'];
            }
        }

        return array_map(static fn (array $labels): array => array_values(array_unique($labels)), $usage);
    }

    /** @return array<string, mixed> */
    private function build(): array
    {
        $sections = (new ContentSection())->allByKey();

        $imageIds = [];

        foreach ($sections as $key => $section) {
            $definition = ContentSchema::section($key);

            if ($definition !== null) {
                array_push($imageIds, ...self::imageIds($definition['fields'], $section['data']));
            }
        }

        $media = array_map(
            static fn (array $row): array => Media::present($row),
            (new Media())->findMany($imageIds)
        );

        $content = [];

        // Dans l'ordre du schéma ; une section jamais enregistrée est absente,
        // et le site garde alors la version intégrée à sa compilation.
        foreach (ContentSchema::sections() as $key => $definition) {
            if (isset($sections[$key])) {
                $content[$key] = self::publish($definition['fields'], $sections[$key]['data'], $media);
            }
        }

        return $content;
    }

    /**
     * @param array<int, array<string, mixed>> $fields
     * @param array<string, mixed>             $data
     * @param array<string, array<string, mixed>> $media
     * @return array<string, mixed>
     */
    private static function publish(array $fields, array $data, array $media): array
    {
        $out = [];

        foreach ($fields as $field) {
            $key = $field['key'];
            $value = $data[$key] ?? null;

            $out[$key] = match ($field['type']) {
                'image'   => Uuid::isValid($value) ? ($media[$value] ?? null) : null,
                'list'    => is_array($value) ? array_values($value) : [],
                'items'   => self::publishItems($field['fields'], is_array($value) ? $value : [], $media),
                'boolean' => (bool) $value,
                default   => is_string($value) ? $value : '',
            };
        }

        return $out;
    }

    /**
     * @param array<int, array<string, mixed>> $fields
     * @param array<int, mixed>                $items
     * @param array<string, array<string, mixed>> $media
     * @return array<int, array<string, mixed>>
     */
    private static function publishItems(array $fields, array $items, array $media): array
    {
        $hasPublished = in_array('published', array_column($fields, 'key'), true);
        $published = [];

        foreach ($items as $item) {
            if (!is_array($item) || ($hasPublished && ($item['published'] ?? true) === false)) {
                continue;
            }

            $entry = self::publish($fields, $item, $media);
            unset($entry['published']);
            $published[] = $entry;
        }

        return $published;
    }

    /**
     * Identifiants des images référencées par des données de section.
     *
     * @param array<int, array<string, mixed>> $fields
     * @param array<string, mixed>             $data
     * @return string[]
     */
    private static function imageIds(array $fields, array $data): array
    {
        $ids = [];

        foreach ($fields as $field) {
            $value = $data[$field['key']] ?? null;

            if ($field['type'] === 'image' && Uuid::isValid($value)) {
                $ids[] = $value;
            } elseif ($field['type'] === 'items' && is_array($value)) {
                foreach ($value as $item) {
                    if (is_array($item)) {
                        array_push($ids, ...self::imageIds($field['fields'], $item));
                    }
                }
            }
        }

        return $ids;
    }

    /** Écriture atomique : un visiteur ne lit jamais un fichier à moitié écrit. */
    private function write(string $file, string $json): void
    {
        $directory = dirname($file);

        if (!is_dir($directory) && !@mkdir($directory, 0750, true) && !is_dir($directory)) {
            return;
        }

        $temporary = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';

        if (@file_put_contents($temporary, $json, LOCK_EX) !== false) {
            @rename($temporary, $file);
        }
    }
}
