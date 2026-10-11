<?php

declare(strict_types=1);

namespace App\Auth;

/**
 * Session du panel d'administration (voir SessionCookie).
 */
final class AdminSession extends SessionCookie
{
    public const COOKIE = 'vlc_admin';

    protected const ROLE = 'admin';

    /**
     * 20 minutes sans activité (demande du 11/10/2026 ; 8 heures fixes
     * auparavant). Chaque action la prolonge (SessionCookie::refresh).
     */
    protected const TTL = 20 * 60;
}
