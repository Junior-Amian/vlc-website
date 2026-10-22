<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\LockedFile;
use App\Core\Middleware;
use App\Core\Request;
use App\Core\Response;
use Closure;

/**
 * Limitation de débit par adresse IP, stockée sur disque.
 *
 * Aucun Redis ni Memcached n'est disponible sur un mutualisé : on utilise
 * un fichier par IP dans storage/cache/ratelimit.
 *
 * Les seuils conviennent au formulaire de contact et à la connexion. Une
 * route aux besoins différents déclare une sous-classe qui redéfinit
 * MAX_ATTEMPTS (voir TrackRateLimitMiddleware) : le routeur instancie les
 * middlewares par leur nom de classe, sans paramètre.
 */
class RateLimitMiddleware implements Middleware
{
    protected const MAX_ATTEMPTS = 5;
    protected const WINDOW_SECONDS = 600;

    public function handle(Request $request, Closure $next): Response
    {
        // Seules les écritures sont limitées : la lecture reste libre.
        if (!in_array($request->method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        $directory = BASE_PATH . '/storage/cache/ratelimit';

        // « @ » : deux premières requêtes simultanées créent le dossier en même
        // temps ; l'avertissement de la seconde deviendrait une erreur 500.
        if (!is_dir($directory) && !@mkdir($directory, 0750, true) && !is_dir($directory)) {
            // Si le stockage est indisponible on laisse passer plutôt que de
            // bloquer tout le formulaire de contact.
            return $next($request);
        }

        $this->purgeExpired($directory);

        $key = hash('sha256', $request->ip . '|' . $request->path);
        $file = $directory . '/' . $key . '.json';
        $now = time();
        $window = static::WINDOW_SECONDS;
        $max = static::MAX_ATTEMPTS;

        // Lecture, contrôle et ajout sous un même verrou : des requêtes
        // simultanées ne peuvent pas toutes passer sur le même compte.
        $retryAfter = LockedFile::update($file, static function (string $contents) use ($now, $window, $max): array {
            $decoded = json_decode($contents, true);
            $timestamps = is_array($decoded)
                ? array_values(array_filter($decoded, static fn ($ts): bool => is_int($ts) && $ts > $now - $window))
                : [];

            if (count($timestamps) >= $max) {
                return [max(1, (int) min($timestamps) + $window - $now), null];
            }

            $timestamps[] = $now;

            return [null, (string) json_encode($timestamps)];
        });

        if ($retryAfter !== null) {
            return Response::error(
                'Trop de demandes envoyées. Merci de réessayer dans quelques minutes.',
                429
            )->withHeader('Retry-After', (string) $retryAfter);
        }

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

        $cutoff = time() - static::WINDOW_SECONDS;

        foreach (glob($directory . '/*.json') ?: [] as $file) {
            if (@filemtime($file) < $cutoff) {
                @unlink($file);
            }
        }
    }
}
