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

    /** Une journée de travail, sans prolongation. */
    protected const TTL = 8 * 3600;
}
