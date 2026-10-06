<?php

declare(strict_types=1);

namespace App\Dossiers;

use App\Models\ClientToken;

/**
 * Liens d'accès à l'espace client, et les emails qui les portent.
 *
 * Le panel reçoit aussi le lien d'invitation en clair : l'équipe peut le
 * transmettre par WhatsApp si l'email n'arrive pas, ce qui est courant avec
 * la fonction mail() d'un mutualisé.
 */
final class ClientAccess
{
    /** Chemins des pages de l'espace client qui reçoivent les liens. */
    private const PAGES = [
        'invite' => '/espace-client/invitation/',
        'reset'  => '/espace-client/nouveau-mot-de-passe/',
    ];

    /**
     * @param array<string, mixed> $client
     * @return array{url: string, emailSent: bool, expiresAt: string}
     */
    public static function invite(array $client): array
    {
        $url = DossierMail::url(self::PAGES['invite'] . (new ClientToken())->issue((string) $client['id'], 'invite'));

        $sent = DossierMail::toClient(
            $client,
            'Votre espace client VISILION CORPORATE',
            'Bienvenue dans votre espace client',
            sprintf(
                "Bonjour %s,\n\nVotre dossier est ouvert. Dans votre espace client, vous suivez son avancement, déposez vos documents en toute sécurité et retrouvez vos paiements.\n\nPour y accéder, choisissez votre mot de passe :",
                DossierMail::firstName($client)
            ),
            ['label' => 'Choisir mon mot de passe', 'url' => $url],
            'Ce lien est valable 7 jours et ne sert qu\'une fois. Passé ce délai, demandez-en un nouveau à votre conseiller.'
        );

        return [
            'url'       => $url,
            'emailSent' => $sent,
            'expiresAt' => date('Y-m-d H:i:s', time() + ClientToken::LIFETIME['invite']),
        ];
    }

    /** @param array<string, mixed> $client */
    public static function sendReset(array $client): void
    {
        $url = DossierMail::url(self::PAGES['reset'] . (new ClientToken())->issue((string) $client['id'], 'reset'));

        DossierMail::toClient(
            $client,
            'Nouveau mot de passe pour votre espace client',
            'Choisissez un nouveau mot de passe',
            sprintf(
                "Bonjour %s,\n\nVous avez demandé à changer le mot de passe de votre espace client.",
                DossierMail::firstName($client)
            ),
            ['label' => 'Choisir un nouveau mot de passe', 'url' => $url],
            'Ce lien est valable une heure. Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email : votre mot de passe actuel reste valable.'
        );
    }
}
