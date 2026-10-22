<?php

declare(strict_types=1);

namespace App\Auth;

use App\Core\LockedFile;
use App\Core\Response;

/**
 * Échecs de connexion comptés par compte, quelle que soit l'adresse IP.
 *
 * RateLimitMiddleware limite chaque IP ; un attaquant qui dispose de
 * nombreuses adresses passerait au travers. Ici, c'est l'adresse email
 * visée qui est bloquée après MAX_FAILURES échecs, le temps que les plus
 * anciens sortent de la fenêtre. Le panel n'imposant aucune règle de mot de
 * passe (demande du client), c'est sa principale défense contre une
 * attaque par dictionnaire.
 *
 * Le compteur porte sur l'email saisi, qu'un compte existe ou non : le
 * blocage ne révèle donc pas quelles adresses sont enregistrées.
 *
 * Chaque tentative est comptée d'avance, sous verrou, avant la vérification
 * du mot de passe (attempt()) ; une connexion réussie remet le compteur à
 * zéro (clear()). Compter l'échec après coup laissait passer une rafale de
 * requêtes simultanées pendant le calcul bcrypt (audit du 22/10/2026).
 *
 * Stocké sur disque (storage/cache/login), comme la limitation de débit :
 * le mutualisé n'offre ni Redis ni Memcached.
 */
final class LoginThrottle
{
    private const MAX_FAILURES = 10;

    private const WINDOW_SECONDS = 900;

    /**
     * Réserve une tentative de connexion.
     *
     * @return int|null null si la tentative est permise (elle est alors déjà
     *                  comptée comme un échec), sinon les secondes avant de
     *                  pouvoir réessayer.
     */
    public static function attempt(string $scope, string $email): ?int
    {
        $file = self::file($scope, $email);

        if ($file === null) {
            return null;
        }

        $now = time();

        $retryAfter = LockedFile::update($file, static function (string $contents) use ($now): array {
            $failures = self::recent($contents, $now);

            if (count($failures) >= self::MAX_FAILURES) {
                return [max(1, min($failures) + self::WINDOW_SECONDS - $now), null];
            }

            $failures[] = $now;

            return [null, (string) json_encode($failures)];
        });

        self::purgeExpired(dirname($file));

        return $retryAfter;
    }

    /** Réponse des deux espaces quand un compte est bloqué. */
    public static function response(int $retryAfter): Response
    {
        return Response::error(
            'Trop de tentatives de connexion sur ce compte. Réessayez dans un quart d\'heure.',
            429
        )->withHeader('Retry-After', (string) $retryAfter);
    }

    /** Après une connexion réussie : la tentative réservée et les échecs passés s'effacent. */
    public static function clear(string $scope, string $email): void
    {
        $file = self::file($scope, $email);

        if ($file !== null && is_file($file)) {
            LockedFile::update($file, static fn (): array => [null, '']);
        }
    }

    /** @return int[] Horodatages des échecs encore dans la fenêtre. */
    private static function recent(string $contents, int $now): array
    {
        $decoded = json_decode($contents, true);
        $since = $now - self::WINDOW_SECONDS;

        return is_array($decoded)
            ? array_values(array_filter($decoded, static fn ($ts): bool => is_int($ts) && $ts > $since))
            : [];
    }

    /** Fichier du compteur, ou null si le stockage est indisponible (on laisse alors passer). */
    private static function file(string $scope, string $email): ?string
    {
        $directory = BASE_PATH . '/storage/cache/login';

        if (!is_dir($directory) && !@mkdir($directory, 0750, true) && !is_dir($directory)) {
            return null;
        }

        return $directory . '/' . hash('sha256', $scope . '|' . mb_strtolower(trim($email))) . '.json';
    }

    /** Nettoyage opportuniste, une fois sur cinquante (voir RateLimitMiddleware). */
    private static function purgeExpired(string $directory): void
    {
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
