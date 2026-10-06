<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use Closure;

/**
 * Protection des routes du panel et de l'espace client contre les requêtes
 * forgées depuis un autre site.
 *
 * Toute requête qui modifie des données doit porter l'en-tête
 * X-Requested-With, posé par le front (src/lib/api.ts). Un formulaire d'un autre
 * site ne peut pas l'ajouter, et un script d'un autre site ne le peut qu'après
 * un pré-vol CORS, que CorsMiddleware refuse aux origines inconnues. Le
 * cookie SameSite=Strict est la première barrière ; celle-ci couvre les
 * navigateurs qui l'ignorent.
 *
 * Ces réponses ne sont jamais mises en cache : elles contiennent des
 * données privées.
 */
final class CsrfMiddleware implements Middleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $isWrite = in_array($request->method, ['POST', 'PUT', 'PATCH', 'DELETE'], true);

        if ($isWrite && $request->header('X-Requested-With') !== 'XMLHttpRequest') {
            return Response::error('Requête refusée.', 403);
        }

        return $next($request)->withHeader('Cache-Control', 'no-store');
    }
}
