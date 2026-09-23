<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use Closure;

/**
 * Limitation de débit par adresse IP, stockée sur disque.
 *
 * Aucun Redis ni Memcached n'est disponible sur un mutualisé : on utilise
 * un fichier par IP dans storage/cache/ratelimit.
 */
final class RateLimitMiddleware implements Middleware
{
    private const MAX_ATTEMPTS = 5;
    private const WINDOW_SECONDS = 600;

    public function handle(Request $request, Closure $next): Response
    {
        // Seules les écritures sont limitées : la lecture reste libre.
        if (!in_array($request->method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        $directory = BASE_PATH . '/storage/cache/ratelimit';

        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            // Si le stockage est indisponible on laisse passer plutôt que de
            // bloquer tout le formulaire de contact.
            return $next($request);
        }

        $this->purgeExpired($directory);

        $key = hash('sha256', $request->ip . '|' . $request->path);
        $file = $directory . '/' . $key . '.json';
        $now = time();

        $timestamps = [];

        if (is_file($file)) {
            $decoded = json_decode((string) file_get_contents($file), true);

            if (is_array($decoded)) {
                $timestamps = array_filter(
                    $decoded,
                    static fn ($ts): bool => is_int($ts) && ($ts > $now - self::WINDOW_SECONDS)
                );
            }
        }

        if (count($timestamps) >= self::MAX_ATTEMPTS) {
            $retryAfter = (int) min($timestamps) + self::WINDOW_SECONDS - $now;

            return Response::error(
                'Trop de demandes envoyées. Merci de réessayer dans quelques minutes.',
                429
            )->withHeader('Retry-After', (string) max(1, $retryAfter));
        }

        $timestamps[] = $now;
        @file_put_contents($file, json_encode(array_values($timestamps)), LOCK_EX);

        return $next($request);
    }

    /**
     * Nettoyage opportuniste : sans cela le dossier grossit indéfiniment,
     * ce qui finit par saturer le quota d'inodes du mutualisé.
     */
    private function purgeExpired(string $directory): void
    {
        // Une fois sur cinquante en moyenne, pour ne pas payer le parcours
        // du dossier à chaque requête.
        if (random_int(1, 50) !== 1) {
            return;
        }

        $cutoff = time() - self::WINDOW_SECONDS;

        foreach (glob($directory . '/*.json') ?: [] as $file) {
            if (@filemtime($file) < $cutoff) {
                @unlink($file);
            }
        }
    }
}
