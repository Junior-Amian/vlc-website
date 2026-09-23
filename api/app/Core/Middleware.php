<?php

declare(strict_types=1);

namespace App\Core;

use Closure;

/**
 * Contrat commun à tous les middlewares.
 *
 * Un middleware peut court-circuiter la chaîne en retournant directement une
 * Response, ou la poursuivre en appelant $next($request).
 */
interface Middleware
{
    public function handle(Request $request, Closure $next): Response;
}
