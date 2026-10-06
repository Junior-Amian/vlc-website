<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Auth\AdminSession;
use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use App\Models\Admin;
use Closure;

/**
 * Réserve une route aux administrateurs connectés.
 *
 * Le compte est relu en base à chaque requête : un compte supprimé, ou dont
 * le mot de passe a changé depuis l'ouverture de la session, est refusé
 * aussitôt, sans attendre l'expiration du jeton.
 *
 * L'administrateur est ensuite disponible par $request->attribute('admin').
 */
final class AdminAuthMiddleware implements Middleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $claims = AdminSession::claims($request);
        $admin = $claims !== null ? (new Admin())->find($claims['id']) : null;

        if ($admin === null || (int) $admin['token_version'] !== $claims['ver']) {
            return AdminSession::end(Response::error('Session expirée. Reconnectez-vous.', 401));
        }

        $request->setAttribute('admin', $admin);

        return $next($request);
    }
}
