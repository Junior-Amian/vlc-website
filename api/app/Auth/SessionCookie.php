<?php

declare(strict_types=1);

namespace App\Auth;

use App\Core\Jwt;
use App\Core\Request;
use App\Core\Response;
use App\Core\Uuid;

/**
 * Session tenue dans un cookie : un jeton JWT signé.
 *
 * Le cookie est `HttpOnly` (illisible par un script injecté dans la page, à
 * l'inverse d'un jeton gardé en localStorage) et `SameSite=Strict` (jamais
 * envoyé depuis un autre site). CsrfMiddleware double cette protection pour
 * les requêtes qui modifient des données.
 *
 * Chaque espace a son cookie, son rôle et sa durée (AdminSession,
 * ClientSession) : un jeton du panel n'ouvre pas l'espace client, et
 * inversement.
 */
abstract class SessionCookie
{
    public const COOKIE = '';

    protected const ROLE = '';

    protected const TTL = 0;

    /** @param array<string, mixed> $account Ligne de la base : id et token_version. */
    public static function start(Response $response, array $account): Response
    {
        $token = Jwt::encode([
            'sub'  => $account['id'],
            'role' => static::ROLE,
            // Comparé à token_version à chaque requête : un changement de mot
            // de passe ferme toutes les sessions ouvertes avant lui.
            'ver'  => (int) $account['token_version'],
        ], static::TTL);

        return $response->withCookie(static::COOKIE, $token, self::options(time() + static::TTL));
    }

    public static function end(Response $response): Response
    {
        return $response->withCookie(static::COOKIE, '', self::options(time() - 3600));
    }

    /** @return array{id: string, ver: int}|null */
    public static function claims(Request $request): ?array
    {
        $token = $request->cookie(static::COOKIE);

        if ($token === null) {
            return null;
        }

        $claims = Jwt::decode($token);

        if ($claims === null || ($claims['role'] ?? null) !== static::ROLE) {
            return null;
        }

        // Un jeton d'avant le passage aux UUID (identifiant entier) est
        // refusé ici : son titulaire se reconnecte, rien de plus.
        $id = $claims['sub'] ?? null;

        if (!Uuid::isValid($id)) {
            return null;
        }

        return ['id' => $id, 'ver' => (int) ($claims['ver'] ?? 0)];
    }

    /** @return array<string, mixed> */
    private static function options(int $expires): array
    {
        return [
            'expires'  => $expires,
            'path'     => '/',
            'secure'   => self::isHttps(),
            'httponly' => true,
            'samesite' => 'Strict',
        ];
    }

    private static function isHttps(): bool
    {
        // Derrière le proxy de certains mutualisés, HTTPS n'est visible que
        // par X-Forwarded-Proto (même test que le .htaccess du site).
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    }
}
