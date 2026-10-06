<?php

declare(strict_types=1);

namespace App\Content;

use App\Core\Uuid;
use App\Core\ValidationException;
use Closure;

/**
 * Valide et nettoie les données d'une section d'après ContentSchema.
 *
 * Seuls les champs décrits par le schéma sont conservés : une charge JSON ne
 * peut pas glisser une clé imprévue dans le contenu publié (même principe
 * que $fillable pour les modèles).
 *
 * Les erreurs sont indexées par chemin pointé (« items.2.title ») : le panel
 * les affiche sous le champ concerné, y compris dans une liste.
 */
final class ContentValidator
{
    /** @var array<string, string[]> */
    private array $errors = [];

    /**
     * @param Closure(string): string[] $optionsFrom Valeurs autorisées d'une source dynamique (« services »).
     * @param Closure(string): bool     $mediaExists Vérifie qu'un média existe encore.
     */
    public function __construct(
        private readonly Closure $optionsFrom,
        private readonly Closure $mediaExists,
    ) {
    }

    /**
     * @param array<string, mixed> $section Définition issue de ContentSchema.
     * @return array<string, mixed> Les données nettoyées.
     * @throws ValidationException
     */
    public function validate(array $section, mixed $data): array
    {
        $this->errors = [];

        $clean = $this->object($section['fields'], is_array($data) ? $data : [], '');

        if ($this->errors !== []) {
            throw new ValidationException($this->errors);
        }

        return $clean;
    }

    /**
     * @param array<int, array<string, mixed>> $fields
     * @param array<string, mixed>             $data
     * @return array<string, mixed>
     */
    private function object(array $fields, array $data, string $prefix): array
    {
        $clean = [];

        foreach ($fields as $field) {
            $clean[$field['key']] = $this->value($field, $data[$field['key']] ?? null, $prefix . $field['key']);
        }

        return $clean;
    }

    /** @param array<string, mixed> $field */
    private function value(array $field, mixed $value, string $path): mixed
    {
        return match ($field['type']) {
            'boolean' => $this->boolean($field, $value),
            'image'   => $this->image($field, $value, $path),
            'list'    => $this->list($field, $value, $path),
            'items'   => $this->items($field, $value, $path),
            default   => $this->string($field, $value, $path),
        };
    }

    /** @param array<string, mixed> $field */
    private function boolean(array $field, mixed $value): bool
    {
        if ($value === null) {
            return (bool) ($field['default'] ?? false);
        }

        return in_array($value, [true, 1, '1', 'true', 'on'], true);
    }

    /** @param array<string, mixed> $field */
    private function image(array $field, mixed $value, string $path): ?string
    {
        if ($value === null || $value === '') {
            if ($field['required'] ?? false) {
                $this->fail($path, 'Choisissez une image.');
            }

            return null;
        }

        if (!Uuid::isValid($value) || !($this->mediaExists)($value)) {
            $this->fail($path, 'Cette image n\'existe plus dans la médiathèque.');

            return null;
        }

        return $value;
    }

    /**
     * @param array<string, mixed> $field
     * @return string[]
     */
    private function list(array $field, mixed $value, string $path): array
    {
        if (!is_array($value)) {
            $value = [];
        }

        $entryField = ['type' => $field['of'] ?? 'string', 'max' => $field['max'] ?? null, 'required' => true];
        $clean = [];

        foreach (array_values($value) as $index => $entry) {
            // Une ligne laissée vide est ignorée plutôt que refusée.
            if ($entry === null || (is_string($entry) && trim($entry) === '')) {
                continue;
            }

            $clean[] = $this->string($entryField, $entry, $path . '.' . $index);
        }

        $this->checkCount($field, count($clean), $path);

        return $clean;
    }

    /**
     * @param array<string, mixed> $field
     * @return array<int, array<string, mixed>>
     */
    private function items(array $field, mixed $value, string $path): array
    {
        if (!is_array($value) || !array_is_list($value)) {
            $value = [];
        }

        $clean = [];

        foreach ($value as $index => $item) {
            $clean[] = $this->object($field['fields'], is_array($item) ? $item : [], $path . '.' . $index . '.');
        }

        $this->checkCount($field, count($clean), $path);

        // Unicité au sein de la liste (ancre d'une prestation, par exemple).
        foreach ($field['fields'] as $subField) {
            if (!($subField['unique'] ?? false)) {
                continue;
            }

            $seen = [];

            foreach ($clean as $index => $item) {
                $key = $item[$subField['key']] ?? '';

                if ($key === '') {
                    continue;
                }

                if (isset($seen[$key])) {
                    $this->fail("{$path}.{$index}.{$subField['key']}", 'Déjà utilisé par une autre fiche de la liste.');
                }

                $seen[$key] = true;
            }
        }

        return $clean;
    }

    /** @param array<string, mixed> $field */
    private function checkCount(array $field, int $count, string $path): void
    {
        $min = (int) ($field['minItems'] ?? (($field['required'] ?? false) ? 1 : 0));
        $max = $field['maxItems'] ?? null;

        if ($count < $min) {
            $this->fail($path, $min === 1 ? 'Ajoutez au moins un élément.' : "Ajoutez au moins {$min} éléments.");
        }

        if ($max !== null && $count > $max) {
            $this->fail($path, "{$max} éléments au maximum.");
        }
    }

    /** @param array<string, mixed> $field */
    private function string(array $field, mixed $value, string $path): string
    {
        if (is_int($value) || is_float($value)) {
            $value = (string) $value;
        }

        if (!is_string($value)) {
            $value = '';
        }

        if (!mb_check_encoding($value, 'UTF-8')) {
            $this->fail($path, 'Texte illisible : caractères invalides.');

            return '';
        }

        $type = $field['type'];
        $value = self::normalize($value, multiline: $type === 'text');

        if ($field['uppercase'] ?? false) {
            $value = mb_strtoupper($value);
        }

        if ($value === '') {
            if (($field['default'] ?? null) !== null) {
                return (string) $field['default'];
            }

            if ($field['required'] ?? false) {
                $this->fail($path, 'Ce champ est obligatoire.');
            }

            return '';
        }

        $max = $field['max'] ?? null;

        if ($max !== null && mb_strlen($value) > $max) {
            $this->fail($path, "{$max} caractères au maximum (actuellement " . mb_strlen($value) . ').');

            return $value;
        }

        if (isset($field['pattern']) && preg_match($field['pattern'], $value) !== 1) {
            $this->fail($path, $field['patternMessage'] ?? 'Format invalide.');

            return $value;
        }

        match ($type) {
            'email'  => filter_var($value, FILTER_VALIDATE_EMAIL) === false
                ? $this->fail($path, 'Adresse email invalide.')
                : null,
            'url'    => $this->checkUrl($value, $path),
            'slug'   => $this->checkSlug($value, $path),
            'icon'   => in_array($value, ContentSchema::ICONS, true)
                ? null
                : $this->fail($path, 'Icône inconnue.'),
            'select' => in_array($value, $this->options($field), true)
                ? null
                : $this->fail($path, 'Choisissez une valeur dans la liste.'),
            default  => null,
        };

        return $value;
    }

    private function checkUrl(string $value, string $path): void
    {
        $scheme = strtolower((string) parse_url($value, PHP_URL_SCHEME));

        // https/http seulement : un lien javascript: serait exécuté au clic.
        if (filter_var($value, FILTER_VALIDATE_URL) === false || !in_array($scheme, ['http', 'https'], true)) {
            $this->fail($path, 'Adresse web invalide : elle doit commencer par https://');
        }
    }

    private function checkSlug(string $value, string $path): void
    {
        if (preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $value) !== 1) {
            $this->fail($path, 'Minuscules sans accents, chiffres et tirets uniquement (ex. : visa-etudiant).');
        } elseif (in_array($value, ContentSchema::RESERVED_SLUGS, true)) {
            $this->fail($path, 'Cet identifiant est déjà pris par une section de la page.');
        }
    }

    /**
     * @param array<string, mixed> $field
     * @return string[]
     */
    private function options(array $field): array
    {
        if (isset($field['optionsFrom'])) {
            return ($this->optionsFrom)((string) $field['optionsFrom']);
        }

        return array_column($field['options'] ?? [], 'value');
    }

    /**
     * Espaces superflus retirés, fins de ligne unifiées, caractères de
     * contrôle supprimés. Un champ d'une ligne n'en garde aucune.
     */
    private static function normalize(string $value, bool $multiline): string
    {
        $value = str_replace(["\r\n", "\r"], "\n", $value);
        $value = (string) preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', $value);

        if (!$multiline) {
            $value = str_replace("\n", ' ', $value);
        } else {
            // Trois sauts de ligne ou plus reviennent à un paragraphe vide.
            $value = (string) preg_replace("/\n{3,}/", "\n\n", $value);
        }

        return trim($value);
    }

    private function fail(string $path, string $message): void
    {
        $this->errors[$path][] = $message;
    }
}
