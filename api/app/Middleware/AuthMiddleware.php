<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Jwt;
use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use Closure;

/**
 * Exige un jeton JWT valide.
 *
 * Prévu pour l'espace client et l'administration (phase 2). Les
 * revendications décodées sont replacées dans la requête sous la clé
 * « auth » pour les contrôleurs.
 */
final class AuthMiddleware implements Middleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if ($token === null) {
            return Response::error('Authentification requise.', 401);
        }

        $claims = Jwt::decode($token);

        if ($claims === null) {
            return Response::error('Session expirée ou jeton invalide.', 401);
        }

        $request->setRouteParams(['__auth_id' => (string) ($claims['sub'] ?? ''), '__auth_role' => (string) ($claims['role'] ?? 'client')]);

        return $next($request);
    }
}
