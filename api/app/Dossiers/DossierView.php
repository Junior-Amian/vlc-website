<?php

declare(strict_types=1);

namespace App\Dossiers;

use App\Models\ChecklistItem;
use App\Models\Client;
use App\Models\ClientToken;
use App\Models\ContentSection;
use App\Models\Document;
use App\Models\Dossier;
use App\Models\DossierPayment;

/**
 * Un dossier tel que l'API le renvoie.
 *
 * L'espace client et le panel reçoivent la même forme, pour que les deux
 * affichent les mêmes chiffres ; le panel y ajoute la fiche du client et la
 * note interne, que le client ne voit jamais.
 */
final class DossierView
{
    /**
     * @param array<string, mixed> $dossier
     * @return array<string, mixed>
     */
    public static function forClient(array $dossier): array
    {
        return self::base($dossier);
    }

    /**
     * @param array<string, mixed> $dossier Ligne de Dossier::findWithSummary().
     * @return array<string, mixed>
     */
    public static function forAdmin(array $dossier): array
    {
        $client = (new Client())->find((string) $dossier['client_id']) ?? [];
        $active = $client !== [] && Client::isActive($client);

        return [
            ...self::base($dossier),
            'note'             => (string) ($dossier['note'] ?? ''),
            'contactRequestId' => $dossier['contact_request_id'] !== null ? (string) $dossier['contact_request_id'] : null,
            // Messages du client que l'équipe n'a pas encore lus.
            'unreadMessages'   => (int) ($dossier['unread_messages'] ?? 0),
            'client'           => [
                'id'         => (string) $dossier['client_id'],
                'fullName'   => (string) ($client['full_name'] ?? ''),
                'email'      => (string) ($client['email'] ?? ''),
                'phone'      => (string) ($client['phone'] ?? ''),
                'active'     => $active,
                'lastLoginAt' => $client['last_login_at'] ?? null,
                'onboardedAt' => $client['onboarded_at'] ?? null,
                // Invitation envoyée et pas encore acceptée : jusqu'à quand le lien vaut.
                'invitationExpiresAt' => $active ? null : (new ClientToken())->pendingInvitation((string) $dossier['client_id']),
                'profile'    => Onboarding::describe($client !== [] ? Client::profile($client) : []),
            ],
        ];
    }

    /**
     * Ligne de la liste du panel : l'essentiel, sans les pièces ni les versements.
     *
     * @param array<string, mixed> $row Ligne de Dossier::search().
     * @param array<string, string> $services
     * @return array<string, mixed>
     */
    public static function summary(array $row, array $services): array
    {
        $total = $row['amount_total'] !== null ? (int) $row['amount_total'] : null;
        $paid = (int) $row['paid'];

        return [
            'id'             => (string) $row['id'],
            'reference'      => Dossier::reference($row),
            'clientName'     => (string) $row['full_name'],
            'clientEmail'    => (string) $row['email'],
            'clientActive'   => (bool) $row['client_active'],
            'service'        => self::service((string) $row['service'], $services),
            'country'        => (string) $row['country'],
            'step'           => (int) $row['step'],
            'itemsRequired'  => (int) $row['items_required'],
            'itemsValidated' => (int) $row['items_validated'],
            'itemsToReview'  => (int) $row['items_to_review'],
            'unreadMessages' => (int) $row['unread_messages'],
            'total'          => $total,
            'paid'           => $paid,
            'updatedAt'      => (string) $row['updated_at'],
        ];
    }

    /** @return array<string, string> Libellé de chaque prestation, par identifiant. */
    public static function services(): array
    {
        return array_column((new ContentSection())->serviceOptions(), 'label', 'value');
    }

    /**
     * @param array<string, mixed> $dossier
     * @return array<string, mixed>
     */
    private static function base(array $dossier): array
    {
        $id = (string) $dossier['id'];
        $documents = (new Document())->forDossier($id);

        $checklist = array_map(
            static fn (array $item): array => [
                'id'              => (string) $item['id'],
                'label'           => (string) $item['label'],
                'help'            => (string) $item['help'],
                'required'        => (bool) $item['required'],
                'status'          => (string) $item['status'],
                'rejectionReason' => $item['rejection_reason'] !== null ? (string) $item['rejection_reason'] : null,
                'documents'       => array_map(
                    [Document::class, 'present'],
                    $documents[(string) $item['id']] ?? []
                ),
            ],
            (new ChecklistItem())->forDossier($id)
        );

        $payments = (new DossierPayment())->forDossier($id);
        $paid = array_sum(array_map(static fn (array $p): int => (int) $p['amount'], $payments));
        $total = $dossier['amount_total'] !== null ? (int) $dossier['amount_total'] : null;

        return [
            'id'            => $id,
            'reference'     => Dossier::reference($dossier),
            'service'       => self::service((string) $dossier['service'], self::services()),
            'country'       => (string) $dossier['country'],
            'step'          => (int) $dossier['step'],
            'stepChangedAt' => (string) $dossier['step_changed_at'],
            'steps'         => Process::steps(),
            'checklist'     => $checklist,
            'finance'       => [
                'total'    => $total,
                'paid'     => $paid,
                // Jamais négatif : un trop-perçu se règle de vive voix.
                'balance'  => $total !== null ? max(0, $total - $paid) : null,
                'payments' => array_map(
                    static fn (array $p): array => [
                        'id'     => (string) $p['id'],
                        'amount' => (int) $p['amount'],
                        'paidOn' => (string) $p['paid_on'],
                        'label'  => (string) $p['label'],
                    ],
                    $payments
                ),
            ],
            'createdAt'     => (string) $dossier['created_at'],
            'updatedAt'     => (string) $dossier['updated_at'],
        ];
    }

    /**
     * @param array<string, string> $services
     * @return array{slug: string, label: string}
     */
    private static function service(string $slug, array $services): array
    {
        // Une prestation retirée du site garde un libellé lisible.
        return ['slug' => $slug, 'label' => $services[$slug] ?? ucfirst(str_replace('-', ' ', $slug))];
    }
}
