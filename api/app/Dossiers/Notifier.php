<?php

declare(strict_types=1);

namespace App\Dossiers;

use App\Models\Client;
use App\Models\Dossier;

/**
 * Emails automatiques de l'espace client (priorité 2 du cahier des charges :
 * « document reçu, étape franchie »), plus ceux sans lesquels la messagerie
 * et les refus de pièces passeraient inaperçus.
 *
 * Au client : documents bien reçus, étape franchie, pièce à refaire, nouveau
 * message de l'équipe. À l'équipe (MAIL_DOSSIERS_ADDRESS) : documents
 * déposés, nouveau message du client.
 *
 * Un client qui n'a pas encore activé son espace ne reçoit rien : il ne
 * pourrait pas s'y connecter. Un échec d'envoi n'empêche jamais l'action
 * (il est journalisé par Mailer).
 */
final class Notifier
{
    /**
     * Délai minimal entre deux emails de dépôt pour un même dossier : un
     * client qui envoie cinq fichiers d'affilée ne reçoit qu'une confirmation.
     */
    private const UPLOAD_QUIET_SECONDS = 15 * 60;

    /**
     * @param array<string, mixed> $dossier
     * @param array<string, mixed> $client
     * @param string[]             $pieces Pièces concernées par le dépôt.
     */
    public static function documentsUploaded(array $dossier, array $client, array $pieces): void
    {
        $dossiers = new Dossier();
        $id = (string) $dossier['id'];
        $reference = Dossier::reference($dossier);
        $list = implode(', ', $pieces);

        if (Client::isActive($client) && $dossiers->claimNotification($id, 'receipt_notified_at', self::UPLOAD_QUIET_SECONDS)) {
            DossierMail::toClient(
                $client,
                "Documents bien reçus · dossier {$reference}",
                'Nous avons bien reçu vos documents',
                sprintf(
                    "Bonjour %s,\n\nVos documents sont arrivés (%s). Votre conseiller les vérifie : si une pièce doit être refaite, vous en serez prévenu par email, avec ce qu'il faut corriger.",
                    DossierMail::firstName($client),
                    $list
                ),
                ['label' => 'Voir mes documents', 'url' => DossierMail::url('/espace-client/documents')]
            );
        }

        if ($dossiers->claimNotification($id, 'upload_notified_at', self::UPLOAD_QUIET_SECONDS)) {
            DossierMail::toTeam(
                "Documents déposés · {$client['full_name']} · {$reference}",
                'Des documents attendent votre vérification',
                sprintf('%s vient de déposer des documents dans son espace client.', $client['full_name']),
                ['Dossier' => $reference, 'Pièces' => $list],
                ['label' => 'Ouvrir le dossier', 'url' => DossierMail::url('/admin/dossiers/' . $id)]
            );
        }
    }

    /**
     * Le dossier passe à une étape suivante (jamais pour un retour en arrière,
     * qui est une correction de l'équipe).
     *
     * @param array<string, mixed> $dossier
     * @param array<string, mixed> $client
     */
    public static function stepAdvanced(array $dossier, array $client, int $step): void
    {
        $current = Process::STEPS[$step] ?? null;

        if ($current === null || !Client::isActive($client)) {
            return;
        }

        DossierMail::toClient(
            $client,
            sprintf('Votre dossier avance : %s · %s', $current['label'], Dossier::reference($dossier)),
            sprintf('Étape %d sur %d : %s', $step, Process::last(), $current['label']),
            sprintf("Bonjour %s,\n\nVotre dossier vient de franchir une étape.\n\n%s", DossierMail::firstName($client), $current['description']),
            ['label' => 'Suivre mon dossier', 'url' => DossierMail::url('/espace-client')]
        );
    }

    /**
     * Une pièce est refusée : le client doit la refaire. Le motif figure dans
     * l'email (il ne dit rien de sensible : « photo floue », « page manquante »).
     *
     * @param array<string, mixed> $dossier
     * @param array<string, mixed> $client
     */
    public static function itemRejected(array $dossier, array $client, string $piece, string $reason): void
    {
        if (!Client::isActive($client)) {
            return;
        }

        DossierMail::toClient(
            $client,
            sprintf('Une pièce est à refaire · dossier %s', Dossier::reference($dossier)),
            "À refaire : {$piece}",
            sprintf("Bonjour %s,\n\nVotre conseiller a vérifié votre document « %s ». Il faut le refaire :\n\n%s", DossierMail::firstName($client), $piece, $reason),
            ['label' => 'Envoyer une nouvelle version', 'url' => DossierMail::url('/espace-client/documents')]
        );
    }

    /**
     * L'équipe a écrit au client. Le message lui-même n'est pas dans l'email :
     * il se lit dans l'espace (voir la classe DossierMail).
     *
     * @param array<string, mixed> $dossier
     * @param array<string, mixed> $client
     */
    public static function teamMessaged(array $dossier, array $client, string $authorName): void
    {
        if (!Client::isActive($client)) {
            return;
        }

        DossierMail::toClient(
            $client,
            sprintf('Nouveau message de votre conseiller · dossier %s', Dossier::reference($dossier)),
            'Vous avez un nouveau message',
            sprintf("Bonjour %s,\n\n%s vous a écrit au sujet de votre dossier. Lisez son message et répondez-lui dans votre espace client.", DossierMail::firstName($client), $authorName),
            ['label' => 'Lire le message', 'url' => DossierMail::url('/espace-client/messages')]
        );
    }

    /**
     * Le client a écrit à l'équipe.
     *
     * @param array<string, mixed> $dossier
     * @param array<string, mixed> $client
     */
    public static function clientMessaged(array $dossier, array $client): void
    {
        $reference = Dossier::reference($dossier);

        DossierMail::toTeam(
            "Nouveau message · {$client['full_name']} · {$reference}",
            'Un client vous a écrit',
            sprintf('%s a envoyé un message depuis son espace client.', $client['full_name']),
            ['Dossier' => $reference],
            ['label' => 'Lire et répondre', 'url' => DossierMail::url('/admin/dossiers/' . $dossier['id'])]
        );
    }
}
