<?php

declare(strict_types=1);

namespace App\Dossiers;

/**
 * Déroulé d'un dossier : ses étapes et ses pièces.
 *
 * Depuis le 23/10/2026, l'équipe définit ses procédures dans le panel
 * (table `procedures`, rubrique « Procédures ») : leurs étapes et leurs
 * pièces sont copiées dans le dossier à son ouverture. Les listes ci-dessous
 * ne servent plus que par défaut : dossier ouvert sans procédure, ou ouvert
 * avant cette date, et proposition de départ d'une nouvelle procédure.
 *
 * PROVISOIRE. Libellés et pièces sont des propositions en attendant ceux du
 * client (réponses du 03/10/2026 : « met des noms fictifs, on les modifiera
 * une fois que j'aurai les étapes exactes »).
 *
 * Les étapes d'un dossier sont rangées par rang (dossiers.step, à partir
 * de 1). La première est franchie d'elle-même à la première connexion du
 * client ; atteindre la dernière termine le dossier.
 */
final class Process
{
    /** @var array<int, array{label: string, description: string}> */
    public const DEFAULT_STEPS = [
        [
            'label'       => 'Dossier ouvert',
            'description' => 'Votre conseiller a ouvert votre dossier.',
        ],
        [
            'label'       => 'Documents à fournir',
            'description' => 'Déposez les pièces demandées. Votre conseiller les vérifie au fur et à mesure.',
        ],
        [
            'label'       => 'Dossier en préparation',
            'description' => 'Vos pièces sont complètes : nous préparons votre demande.',
        ],
        [
            'label'       => 'Déposé au consulat',
            'description' => 'Votre demande est entre les mains du consulat. Les délais dépendent de lui.',
        ],
        [
            'label'       => 'Décision rendue',
            'description' => 'Le consulat a rendu sa décision. Votre conseiller vous contacte.',
        ],
    ];

    /**
     * Pièces d'un dossier ouvert sans procédure, puis ajustées à la main
     * dans le panel.
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

    /**
     * Étapes d'un dossier, numérotées : la copie faite à son ouverture, ou
     * les étapes par défaut.
     *
     * @param array<string, mixed> $dossier Ligne de la table `dossiers`.
     * @return array<int, array{number: int, label: string, description: string}>
     */
    public static function stepsOf(array $dossier): array
    {
        $stored = isset($dossier['steps']) ? json_decode((string) $dossier['steps'], true) : null;

        return self::numbered(is_array($stored) && $stored !== [] ? $stored : self::DEFAULT_STEPS);
    }

    /**
     * Colonnes à écrire quand un dossier passe à l'étape `$step` : le libellé
     * suit, pour les filtres et compteurs de la liste du panel.
     *
     * @param array<int, array{number: int, label: string, description: string}> $steps
     * @return array{step: int, step_label: string, step_changed_at: string}
     */
    public static function moveTo(array $steps, int $step): array
    {
        return [
            'step'            => $step,
            'step_label'      => $steps[$step - 1]['label'] ?? '',
            'step_changed_at' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $steps Étapes [{label, description}], dans l'ordre.
     * @return array<int, array{number: int, label: string, description: string}>
     */
    public static function numbered(array $steps): array
    {
        $numbered = [];

        foreach (array_values($steps) as $index => $step) {
            $numbered[] = [
                'number'      => $index + 1,
                'label'       => (string) ($step['label'] ?? ''),
                'description' => (string) ($step['description'] ?? ''),
            ];
        }

        return $numbered;
    }
}
