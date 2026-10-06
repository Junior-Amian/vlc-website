<?php

declare(strict_types=1);

namespace App\Dossiers;

/**
 * Déroulé d'un dossier : ses étapes et les pièces demandées par défaut.
 *
 * PROVISOIRE. Libellés et pièces sont des propositions en attendant ceux du
 * client (réponses du 03/10/2026 : « met des noms fictifs, on les modifiera
 * une fois que j'aurai les étapes exactes »). Tout tient ici : l'espace
 * client et le panel lisent ces listes par l'API, sans copie côté front.
 *
 * Les étapes sont rangées par numéro (dossiers.step). Changer un libellé
 * est sans risque ; retirer une étape impose de renuméroter les dossiers
 * qui s'y trouvent.
 */
final class Process
{
    /** @var array<int, array{label: string, description: string}> */
    public const STEPS = [
        1 => [
            'label'       => 'Dossier ouvert',
            'description' => 'Votre conseiller a ouvert votre dossier.',
        ],
        2 => [
            'label'       => 'Documents à fournir',
            'description' => 'Déposez les pièces demandées. Votre conseiller les vérifie au fur et à mesure.',
        ],
        3 => [
            'label'       => 'Dossier en préparation',
            'description' => 'Vos pièces sont complètes : nous préparons votre demande.',
        ],
        4 => [
            'label'       => 'Déposé au consulat',
            'description' => 'Votre demande est entre les mains du consulat. Les délais dépendent de lui.',
        ],
        5 => [
            'label'       => 'Décision rendue',
            'description' => 'Le consulat a rendu sa décision. Votre conseiller vous contacte.',
        ],
    ];

    /**
     * Pièces copiées dans chaque nouveau dossier, puis ajustées à la main
     * dans le panel. Des listes par type de visa et par pays sont prévues
     * plus tard (V2 du cahier des charges).
     *
     * @var array<int, array{label: string, help: string, required: bool}>
     */
    public const DEFAULT_CHECKLIST = [
        [
            'label'    => 'Passeport',
            'help'     => 'Page d\'identité et pages portant un visa. Il doit être valable encore six mois après le retour.',
            'required' => true,
        ],
        [
            'label'    => 'Photo d\'identité',
            'help'     => 'Récente, sur fond clair, sans lunettes.',
            'required' => true,
        ],
        [
            'label'    => 'Acte de naissance',
            'help'     => 'Copie intégrale.',
            'required' => true,
        ],
        [
            'label'    => 'Relevés bancaires',
            'help'     => 'Les trois derniers mois, avec le nom du titulaire visible.',
            'required' => true,
        ],
        [
            'label'    => 'Justificatif d\'activité',
            'help'     => 'Attestation de travail, certificat de scolarité ou registre de commerce.',
            'required' => false,
        ],
    ];

    public const FIRST_STEP = 1;

    public static function last(): int
    {
        return (int) array_key_last(self::STEPS);
    }

    public static function exists(int $step): bool
    {
        return isset(self::STEPS[$step]);
    }

    /** @return array<int, array{number: int, label: string, description: string}> */
    public static function steps(): array
    {
        $steps = [];

        foreach (self::STEPS as $number => $step) {
            $steps[] = ['number' => $number, ...$step];
        }

        return $steps;
    }
}
