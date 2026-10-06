<?php

declare(strict_types=1);

namespace App\Middleware;

/**
 * Limitation de débit de la mesure d'audience (POST /track).
 *
 * Un visiteur envoie au plus quelques mesures par page vue (la page, les
 * sections groupées, les prises de contact) : 120 envois par IP en 10 minutes
 * laissent une large marge, tout en empêchant un script de remplir la base.
 * Le plafond par visiteur d'AnalyticsEvent ne suffit pas seul : il se
 * contourne en changeant d'identité de navigateur.
 */
final class TrackRateLimitMiddleware extends RateLimitMiddleware
{
    protected const MAX_ATTEMPTS = 120;
}
