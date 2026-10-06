<?php

declare(strict_types=1);

namespace App\Auth;

/**
 * Session de l'espace client (voir SessionCookie).
 *
 * Plus longue que celle du panel : le client consulte son dossier de loin en
 * loin, le plus souvent depuis son téléphone, et ne doit pas retaper son mot
 * de passe à chaque visite. Un changement de mot de passe la ferme partout.
 */
final class ClientSession extends SessionCookie
{
    public const COOKIE = 'vlc_client';

    protected const ROLE = 'client';

    protected const TTL = 14 * 24 * 3600;
}
