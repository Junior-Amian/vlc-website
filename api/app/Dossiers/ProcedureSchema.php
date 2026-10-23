<?php

declare(strict_types=1);

namespace App\Dossiers;

/**
 * Formulaire d'une procédure, dans le vocabulaire de ContentSchema : le
 * panel le construit avec les mêmes champs que les sections du site, et
 * ContentValidator le valide de la même façon.
 */
final class ProcedureSchema
{
    /** Au-delà, la frise des étapes de l'espace client ne tient plus sur grand écran. */
    public const MAX_STEPS = 10;

    /** @return array<int, array<string, mixed>> */
    public static function fields(): array
    {
        $f = static fn (string $type, string $key, string $label, array $extra = []): array => array_merge(
            ['key' => $key, 'type' => $type, 'label' => $label, 'required' => true],
            $extra
        );

        return [
            $f('select', 'service', 'Prestation', [
                'optionsFrom' => 'services',
                'help'        => 'La prestation du site dont relève la procédure : elle est proposée à l\'ouverture d\'un dossier de cette prestation.',
            ]),
            $f('string', 'name', 'Nom de la procédure', [
                'max'  => 120,
                'help' => 'Ex. : Visa visiteur – salarié. C\'est ce nom qu\'on choisit à l\'ouverture d\'un dossier.',
            ]),
            $f('items', 'steps', 'Étapes du suivi', [
                'itemLabel'  => 'Étape',
                'titleField' => 'label',
                'minItems'   => 3,
                'maxItems'   => self::MAX_STEPS,
                'help'       => 'Dans l\'ordre du suivi : le client voit l\'étape en cours et sa description. La première est franchie d\'elle-même quand le client se connecte pour la première fois ; la dernière termine le dossier.',
                'fields'     => [
                    $f('string', 'label', 'Libellé', ['max' => 80]),
                    $f('text', 'description', 'Ce que le client lit à cette étape', ['max' => 300, 'required' => false]),
                ],
            ]),
            $f('items', 'checklist', 'Pièces à fournir', [
                'itemLabel'  => 'Pièce',
                'titleField' => 'label',
                'maxItems'   => 30,
                'required'   => false,
                'help'       => 'Copiées dans le dossier à son ouverture. Vous pourrez encore en ajouter ou en retirer dans la fiche du dossier.',
                'fields'     => [
                    $f('string', 'label', 'Pièce', ['max' => 160]),
                    $f('string', 'help', 'Précision pour le client', [
                        'max'      => 300,
                        'required' => false,
                        'help'     => 'Ex. : Copie intégrale, de moins de trois mois.',
                    ]),
                    $f('boolean', 'required', 'Obligatoire', ['default' => true]),
                ],
            ]),
        ];
    }
}
