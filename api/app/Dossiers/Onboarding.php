<?php

declare(strict_types=1);

namespace App\Dossiers;

use App\Core\ValidationException;

/**
 * Questions posées au client à sa première connexion.
 *
 * PROVISOIRE : le client n'a pas encore fourni la liste (réponse du
 * 03/10/2026 : « met des infos fictives »). Ces questions courantes d'une
 * demande de visa en tiennent lieu.
 *
 * Comme ContentSchema pour le contenu du site, cette liste décrit le
 * formulaire : l'espace client l'affiche telle que l'API la lui donne, et
 * les réponses sont rangées en JSON (clients.profile). Ajouter, retirer ou
 * renommer une question ne touche donc ni la base ni le front.
 *
 * Types : string, date (AAAA-MM-JJ, dans le passé), select (options).
 */
final class Onboarding
{
    /** @var array<int, array{title: string, description: string}> */
    public const GROUPS = [
        1 => [
            'title'       => 'Votre identité',
            'description' => 'Telle qu\'elle figure sur votre passeport.',
        ],
        2 => [
            'title'       => 'Votre situation',
            'description' => 'Pour préparer votre demande avec votre conseiller.',
        ],
    ];

    /** @var array<int, array<string, mixed>> */
    public const FIELDS = [
        ['key' => 'birth_date', 'group' => 1, 'type' => 'date', 'label' => 'Date de naissance', 'required' => true],
        ['key' => 'birth_place', 'group' => 1, 'type' => 'string', 'label' => 'Lieu de naissance', 'required' => true, 'max' => 120],
        ['key' => 'nationality', 'group' => 1, 'type' => 'string', 'label' => 'Nationalité', 'required' => true, 'max' => 80],
        [
            'key'      => 'passport_number',
            'group'    => 1,
            'type'     => 'string',
            'label'    => 'Numéro de passeport',
            'required' => false,
            'max'      => 30,
            'help'     => 'Si vous en avez déjà un.',
            'uppercase' => true,
        ],
        [
            'key'      => 'marital_status',
            'group'    => 2,
            'type'     => 'select',
            'label'    => 'Situation familiale',
            'required' => true,
            'options'  => [
                ['value' => 'single', 'label' => 'Célibataire'],
                ['value' => 'married', 'label' => 'Marié(e)'],
                ['value' => 'divorced', 'label' => 'Divorcé(e)'],
                ['value' => 'widowed', 'label' => 'Veuf ou veuve'],
            ],
        ],
        ['key' => 'occupation', 'group' => 2, 'type' => 'string', 'label' => 'Profession', 'required' => true, 'max' => 120, 'help' => 'Ou « étudiant », « sans emploi ».'],
        ['key' => 'city', 'group' => 2, 'type' => 'string', 'label' => 'Ville de résidence', 'required' => true, 'max' => 80, 'autocomplete' => 'address-level2'],
    ];

    /** Le formulaire, tel que l'espace client l'affiche. @return array<string, mixed> */
    public static function form(): array
    {
        $groups = [];

        foreach (self::GROUPS as $number => $group) {
            $groups[] = [
                'number' => $number,
                ...$group,
                'fields' => array_values(array_filter(
                    self::FIELDS,
                    static fn (array $field): bool => $field['group'] === $number
                )),
            ];
        }

        return ['groups' => $groups];
    }

    /**
     * Réponses nettoyées, limitées aux questions connues.
     *
     * @return array<string, string>
     * @throws ValidationException
     */
    public static function validate(mixed $input): array
    {
        $input = is_array($input) ? $input : [];
        $answers = [];
        $errors = [];

        foreach (self::FIELDS as $field) {
            $key = (string) $field['key'];
            $value = $input[$key] ?? '';
            $value = is_string($value) ? trim($value) : '';

            if ($value === '') {
                if ($field['required']) {
                    $errors[$key][] = 'Ce champ est obligatoire.';
                }

                continue;
            }

            $error = match ($field['type']) {
                'date'   => self::dateError($value),
                'select' => in_array($value, array_column($field['options'], 'value'), true) ? null : 'Choisissez une réponse dans la liste.',
                default  => mb_strlen($value) > (int) ($field['max'] ?? 200) ? sprintf('%d caractères au maximum.', $field['max'] ?? 200) : null,
            };

            if ($error !== null) {
                $errors[$key][] = $error;
                continue;
            }

            $answers[$key] = !empty($field['uppercase']) ? mb_strtoupper($value) : $value;
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return $answers;
    }

    /**
     * Réponses accompagnées de leur libellé, dans l'ordre du formulaire,
     * pour la fiche du panel.
     *
     * @param array<string, mixed> $answers
     * @return array<int, array{label: string, value: string}>
     */
    public static function describe(array $answers): array
    {
        $rows = [];

        foreach (self::FIELDS as $field) {
            $value = $answers[$field['key']] ?? null;

            if (!is_string($value) || $value === '') {
                continue;
            }

            if ($field['type'] === 'select') {
                $options = array_column($field['options'], 'label', 'value');
                $value = $options[$value] ?? $value;
            }

            if ($field['type'] === 'date') {
                $value = date('d/m/Y', (int) strtotime($value));
            }

            $rows[] = ['label' => (string) $field['label'], 'value' => $value];
        }

        return $rows;
    }

    private static function dateError(string $value): ?string
    {
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);

        if ($date === false || $date->format('Y-m-d') !== $value) {
            return 'Date invalide.';
        }

        if ($date > new \DateTimeImmutable('today') || $date < new \DateTimeImmutable('1900-01-01')) {
            return 'Vérifiez la date.';
        }

        return null;
    }
}
