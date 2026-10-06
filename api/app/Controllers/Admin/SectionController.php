<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Content\ContentPublisher;
use App\Content\ContentSchema;
use App\Content\ContentValidator;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Uuid;
use App\Models\ContentSection;
use App\Models\Media;

/**
 * Lecture et modification des sections du site depuis le panel.
 */
final class SectionController extends Controller
{
    /** Le schéma, d'où le panel tire ses formulaires. */
    public function schema(Request $request): Response
    {
        $sections = [];

        foreach (ContentSchema::sections() as $key => $definition) {
            $sections[] = ['key' => $key, ...$definition];
        }

        return Response::success([
            'sections' => $sections,
            'icons'    => ContentSchema::ICONS,
        ]);
    }

    public function show(Request $request): Response
    {
        $key = (string) $request->param('key');
        $definition = ContentSchema::section($key);

        if ($definition === null) {
            return Response::error('Section inconnue.', 404);
        }

        return Response::success($this->present($key, (new ContentSection())->findByKey($key)));
    }

    public function update(Request $request): Response
    {
        $key = (string) $request->param('key');
        $definition = ContentSchema::section($key);

        if ($definition === null) {
            return Response::error('Section inconnue.', 404);
        }

        $sections = new ContentSection();
        $media = new Media();

        $validator = new ContentValidator(
            optionsFrom: fn (string $source): array => $this->optionValues($sections, $source),
            mediaExists: static fn (string $id): bool => $media->find($id) !== null,
        );

        $data = $validator->validate($definition, $request->input('data'));

        $version = filter_var($request->input('version', 0), FILTER_VALIDATE_INT);
        $admin = $request->attribute('admin');

        $saved = $sections->save($key, $data, $version === false ? -1 : $version, (string) $admin['id']);

        if ($saved === null) {
            $author = $sections->findByKey($key)['updated_by'] ?? null;

            return Response::error(
                sprintf(
                    'Cette section a été modifiée entre-temps%s. Rechargez-la pour partir de la dernière version : vos modifications non enregistrées seront perdues.',
                    $author !== null ? ' par ' . $author : ''
                ),
                409
            );
        }

        (new ContentPublisher())->invalidate();

        return Response::success($this->present($key, $sections->findByKey($key)), 'Modifications enregistrées.');
    }

    /**
     * La section, les images qu'elle référence (pour leurs vignettes) et les
     * listes de choix dynamiques de son formulaire.
     *
     * @param array{data: array<string, mixed>, version: int, updated_at: string, updated_by: ?string}|null $section
     * @return array<string, mixed>
     */
    private function present(string $key, ?array $section): array
    {
        $data = $section['data'] ?? null;
        $mediaIds = [];

        if (is_array($data)) {
            array_walk_recursive($data, static function (mixed $value) use (&$mediaIds): void {
                // Les images sont les seules valeurs du contenu en forme
                // d'UUID : aucun texte saisi n'en a la forme exacte.
                if (Uuid::isValid($value)) {
                    $mediaIds[] = $value;
                }
            });
        }

        $sections = new ContentSection();

        return [
            'key'       => $key,
            // null : section jamais enregistrée. Le panel part alors d'un
            // formulaire vide, et le site garde sa version compilée.
            'data'      => $data,
            'version'   => $section['version'] ?? 0,
            'updatedAt' => $section['updated_at'] ?? null,
            'updatedBy' => $section['updated_by'] ?? null,
            'media'     => (object) array_map(
                static fn (array $row): array => Media::present($row),
                (new Media())->findMany($mediaIds)
            ),
            'options'   => [
                'services' => $sections->serviceOptions(),
            ],
        ];
    }

    /** @return string[] */
    private function optionValues(ContentSection $sections, string $source): array
    {
        return match ($source) {
            'services' => array_column($sections->serviceOptions(), 'value'),
            default    => [],
        };
    }
}
