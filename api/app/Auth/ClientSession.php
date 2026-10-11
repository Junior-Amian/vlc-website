<?php

declare(strict_types=1);

namespace App\Auth;

/**
 * Session de l'espace client (voir SessionCookie).
 *
 * 20 minutes sans activité, comme le panel (demande du 11/10/2026 : 14 jours
 * laissaient un dossier ouvert sur un ordinateur partagé). Chaque action la
 * prolonge (SessionCookie::refresh). Un changement de mot de passe la ferme
 * partout.
 */
final class ClientSession extends SessionCookie
{
    public const COOKIE = 'vlc_client';

    protected const ROLE = 'client';

    protected const TTL = 20 * 60;
}
