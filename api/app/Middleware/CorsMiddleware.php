<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use Closure;

/**
 * Gestion CORS : le front React est servi depuis une origine distincte de
 * l'API en développement (localhost:5173 contre localhost/api).
 */
final class CorsMiddleware implements Middleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $config = require BASE_PATH . '/config/cors.php';

        $origin = $request->header('Origin');
        $allowed = $config['allowed_origins'];

        // On ne renvoie jamais « * » : l'espace client enverra des jetons,
        // et un joker interdirait les requêtes authentifiées.
        $allowedOrigin = ($origin !== null && in_array($origin, $allowed, true)) ? $origin : null;

        // Les pré-vols OPTIONS ne doivent pas atteindre les contrôleurs.
        if ($request->method === 'OPTIONS') {
            $response = Response::noContent();

            return $this->decorate($response, $allowedOrigin, $config);
        }

        return $this->decorate($next($request), $allowedOrigin, $config);
    }

    /** @param array<string, mixed> $config */
    private function decorate(Response $response, ?string $origin, array $config): Response
    {
        if ($origin !== null) {
            $response->withHeader('Access-Control-Allow-Origin', $origin)
                ->withHeader('Access-Control-Allow-Credentials', 'true')
                // Le cache HTTP doit distinguer les réponses selon l'origine.
                ->withHeader('Vary', 'Origin');
        }

        return $response
            ->withHeader('Access-Control-Allow-Methods', implode(', ', $config['allowed_methods']))
            ->withHeader('Access-Control-Allow-Headers', implode(', ', $config['allowed_headers']))
            ->withHeader('Access-Control-Max-Age', (string) $config['max_age']);
    }
}
