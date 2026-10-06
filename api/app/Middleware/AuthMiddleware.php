<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Auth\ClientSession;
use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use App\Models\Client;
use Closure;

/**
 * Réserve une route aux clients connectés à leur espace.
 *
 * Même principe que AdminAuthMiddleware : le compte est relu en base à
 * chaque requête, si bien qu'un compte supprimé ou dont le mot de passe a
 * changé est refusé aussitôt, sans attendre l'expiration du cookie.
 *
 * Le client est ensuite disponible par $request->attribute('client'). Toute
 * requête des contrôleurs de l'espace client part de son identifiant : un
 * client ne peut atteindre que ses propres données.
 */
final class AuthMiddleware implements Middleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $claims = ClientSession::claims($request);
        $client = $claims !== null ? (new Client())->find($claims['id']) : null;

        if (
            $client === null
            || $client['password_hash'] === null
            || (int) $client['token_version'] !== $claims['ver']
        ) {
            return ClientSession::end(Response::error('Session expirée. Reconnectez-vous.', 401));
        }

        $request->setAttribute('client', $client);

        return $next($request);
    }
}
