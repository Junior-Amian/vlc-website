<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Jetons JWT signés en HS256.
 *
 * Utilisé par l'espace client et l'administration (phase 2). La classe est
 * livrée dès la phase 1 pour que l'authentification n'impose aucune
 * refonte du socle le moment venu.
 */
final class Jwt
{
    public static function encode(array $claims, int $ttlSeconds = 3600): string
    {
        $now = time();

        $payload = [
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + $ttlSeconds,
            'jti' => bin2hex(random_bytes(16)),
            ...$claims,
        ];

        $header = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $body = self::base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));

        $signature = self::base64UrlEncode(
            hash_hmac('sha256', $header . '.' . $body, self::secret(), true)
        );

        return $header . '.' . $body . '.' . $signature;
    }

    /** @return array<string, mixed>|null Les revendications, ou null si le jeton est invalide. */
    public static function decode(string $token): ?array
    {
        $segments = explode('.', $token);

        if (count($segments) !== 3) {
            return null;
        }

        [$header, $body, $signature] = $segments;

        $expected = self::base64UrlEncode(
            hash_hmac('sha256', $header . '.' . $body, self::secret(), true)
        );

        // Comparaison à temps constant : un === classique fuiterait la
        // signature attendue octet par octet.
        if (!hash_equals($expected, $signature)) {
            return null;
        }

        $claims = json_decode(self::base64UrlDecode($body), true);

        if (!is_array($claims)) {
            return null;
        }

        $now = time();

        if (isset($claims['exp']) && $now >= (int) $claims['exp']) {
            return null;
        }

        if (isset($claims['nbf']) && $now < (int) $claims['nbf']) {
            return null;
        }

        return $claims;
    }

    private static function secret(): string
    {
        $secret = (string) Env::get('JWT_SECRET', '');

        if (strlen($secret) < 32) {
            throw new \RuntimeException(
                'JWT_SECRET doit contenir au moins 32 caractères. Générez-le avec : php -r "echo bin2hex(random_bytes(32));"'
            );
        }

        return $secret;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        return (string) base64_decode(strtr($value, '-_', '+/'), true);
    }
}
