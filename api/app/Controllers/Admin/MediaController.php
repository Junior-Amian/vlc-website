<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Content\ContentPublisher;
use App\Core\Controller;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Core\ValidationException;
use App\Models\Media;
use finfo;

/**
 * Médiathèque du panel.
 *
 * Les images arrivent déjà redimensionnées : le navigateur de
 * l'administrateur produit chaque largeur avant l'envoi
 * (frontend/src/admin/lib/resizeImage.ts). L'hébergement mutualisé ne
 * garantit pas la bibliothèque GD ; le serveur se contente donc de vérifier
 * et de ranger les fichiers.
 */
final class MediaController extends Controller
{
    /** Types acceptés et extension enregistrée pour chacun. */
    private const TYPES = [
        'image/webp' => 'webp',
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
    ];

    private const MAX_VARIANTS = 5;
    private const MAX_FILE_BYTES = 4 * 1024 * 1024;
    private const MAX_DIMENSION = 3000;

    public function index(Request $request): Response
    {
        $usage = (new ContentPublisher())->mediaUsage();

        $items = array_map(
            fn (array $row): array => $this->presentItem($row, $usage[(string) $row['id']] ?? []),
            (new Media())->all('created_at', 'DESC', 500)
        );

        return Response::success($items);
    }

    /**
     * Une image telle que la médiathèque du panel l'affiche : l'image
     * publique, plus ce qui ne sert qu'à l'administrateur.
     *
     * @param array<string, mixed> $row
     * @param string[]             $usedIn Sections qui affichent l'image.
     * @return array<string, mixed>
     */
    private function presentItem(array $row, array $usedIn): array
    {
        return [
            ...Media::present($row),
            'originalName' => (string) $row['original_name'],
            'size'         => (int) $row['size'],
            'createdAt'    => (string) $row['created_at'],
            'usedIn'       => $usedIn,
        ];
    }

    public function store(Request $request): Response
    {
        $files = $this->uploadedFiles($request->files['variants'] ?? null);
        $widths = $request->input('widths');
        $alt = $this->alt($request->input('alt'));

        if ($files === [] || count($files) > self::MAX_VARIANTS) {
            throw new ValidationException(['variants' => ['Envoyez entre une et ' . self::MAX_VARIANTS . ' largeurs de l\'image.']]);
        }

        if (!is_array($widths) || count($widths) !== count($files)) {
            throw new ValidationException(['variants' => ['Largeurs manquantes.']]);
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $variants = [];

        foreach ($files as $index => $file) {
            $variants[] = $this->inspect($file, (int) $widths[$index], $finfo);
        }

        usort($variants, static fn (array $a, array $b): int => $a['width'] <=> $b['width']);

        $relativeDir = date('Y/m');
        $directory = Media::directory() . '/' . $relativeDir;

        if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
            Logger::error('Dossier des médias non accessible en écriture', ['directory' => $directory]);

            return Response::error('Le serveur ne peut pas enregistrer l\'image pour le moment.', 500);
        }

        // Un nom aléatoire commun à toutes les largeurs : rien du nom
        // d'origine ne se retrouve dans l'adresse publique du fichier.
        $basename = bin2hex(random_bytes(8));
        $stored = [];
        $totalSize = 0;

        foreach ($variants as $variant) {
            $file = sprintf('%s/%s-%d.%s', $relativeDir, $basename, $variant['width'], $variant['extension']);

            if (!move_uploaded_file($variant['tmp'], Media::directory() . '/' . $file)) {
                $this->deleteFiles($stored);

                return Response::error('Le serveur n\'a pas pu enregistrer l\'image.', 500);
            }

            $stored[] = ['w' => $variant['width'], 'file' => $file];
            $totalSize += $variant['size'];
        }

        $largest = $variants[count($variants) - 1];

        $id = (new Media())->create([
            // Nom du fichier choisi par l'administrateur, à défaut celui de
            // la première largeur reçue.
            'original_name' => $this->originalName(
                is_string($request->input('name')) ? $request->input('name') : $files[0]['name']
            ),
            'alt'           => $alt,
            'width'         => $largest['width'],
            'height'        => $largest['height'],
            'variants'      => json_encode($stored, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            'size'          => $totalSize,
            'created_by'    => (string) $request->attribute('admin')['id'],
        ]);

        return Response::success(
            $this->presentItem((new Media())->find($id), []),
            'Image ajoutée à la médiathèque.',
            201
        );
    }

    public function update(Request $request): Response
    {
        $media = new Media();
        $row = $this->findOr404($media, $request);

        if ($row instanceof Response) {
            return $row;
        }

        $media->update((string) $row['id'], ['alt' => $this->alt($request->input('alt'))]);
        (new ContentPublisher())->invalidate();

        return Response::success(Media::present($media->find((string) $row['id'])), 'Description enregistrée.');
    }

    public function destroy(Request $request): Response
    {
        $media = new Media();
        $row = $this->findOr404($media, $request);

        if ($row instanceof Response) {
            return $row;
        }

        $usedIn = (new ContentPublisher())->mediaUsage()[(string) $row['id']] ?? [];

        if ($usedIn !== []) {
            return Response::error(
                'Cette image est encore utilisée (' . implode(', ', $usedIn) . '). Retirez-la de ces sections avant de la supprimer.',
                409
            );
        }

        $variants = json_decode((string) $row['variants'], true);
        $media->delete((string) $row['id']);
        $this->deleteFiles(is_array($variants) ? $variants : []);

        return Response::success(null, 'Image supprimée.');
    }

    /** @return array<string, mixed>|Response */
    private function findOr404(Media $media, Request $request): array|Response
    {
        $row = $media->find($this->routeId($request));

        return $row ?? Response::error('Image introuvable.', 404);
    }

    /**
     * Remet à plat la structure de $_FILES pour un champ multiple (variants[]).
     *
     * @return array<int, array{name: string, tmp_name: string, error: int, size: int}>
     */
    private function uploadedFiles(mixed $field): array
    {
        if (!is_array($field) || !is_array($field['tmp_name'] ?? null)) {
            return [];
        }

        $files = [];

        foreach (array_keys($field['tmp_name']) as $index) {
            $files[] = [
                'name'     => (string) ($field['name'][$index] ?? ''),
                'tmp_name' => (string) $field['tmp_name'][$index],
                'error'    => (int) ($field['error'][$index] ?? UPLOAD_ERR_NO_FILE),
                'size'     => (int) ($field['size'][$index] ?? 0),
            ];
        }

        return $files;
    }

    /**
     * Vérifie un fichier reçu : envoi complet, vrai type d'image (lu dans le
     * contenu, pas dans le nom), dimensions conformes à la largeur annoncée.
     *
     * @param array{name: string, tmp_name: string, error: int, size: int} $file
     * @return array{tmp: string, width: int, height: int, extension: string, size: int}
     */
    private function inspect(array $file, int $declaredWidth, finfo $finfo): array
    {
        if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) {
            throw new ValidationException(['variants' => ['Image trop lourde pour le serveur.']]);
        }

        if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            throw new ValidationException(['variants' => ['L\'envoi de l\'image a échoué. Réessayez.']]);
        }

        if ($file['size'] > self::MAX_FILE_BYTES) {
            throw new ValidationException(['variants' => ['Image trop lourde (4 Mo au maximum par largeur).']]);
        }

        $mime = (string) $finfo->file($file['tmp_name']);
        $size = @getimagesize($file['tmp_name']);

        if (!isset(self::TYPES[$mime]) || $size === false) {
            throw new ValidationException(['variants' => ['Format non pris en charge : JPEG, PNG ou WebP uniquement.']]);
        }

        [$width, $height] = $size;

        if ($width !== $declaredWidth || $width > self::MAX_DIMENSION || $height > self::MAX_DIMENSION) {
            throw new ValidationException(['variants' => ['Dimensions de l\'image incohérentes.']]);
        }

        return [
            'tmp'       => $file['tmp_name'],
            'width'     => $width,
            'height'    => $height,
            'extension' => self::TYPES[$mime],
            'size'      => $file['size'],
        ];
    }

    private function alt(mixed $value): string
    {
        $alt = trim(is_string($value) ? $value : '');

        if (mb_strlen($alt) > 200) {
            throw new ValidationException(['alt' => ['200 caractères au maximum.']]);
        }

        return $alt;
    }

    private function originalName(string $name): string
    {
        $name = basename(str_replace('\\', '/', $name));

        return mb_substr($name !== '' ? $name : 'image', 0, 255);
    }

    /** @param array<int, array{file?: string}> $variants */
    private function deleteFiles(array $variants): void
    {
        $root = realpath(Media::directory());

        foreach ($variants as $variant) {
            $path = realpath(Media::directory() . '/' . ($variant['file'] ?? ''));

            // Jamais en dehors du dossier des médias, quel que soit le chemin enregistré.
            if ($root !== false && $path !== false && str_starts_with($path, $root . DIRECTORY_SEPARATOR) && is_file($path)) {
                @unlink($path);
            }
        }
    }
}
