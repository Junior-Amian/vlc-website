<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Autoloader PSR-4 minimaliste.
 *
 * L'hébergement mutualisé ne garantit pas l'accès à Composer en ligne de
 * commande : on enregistre donc nous-mêmes la correspondance entre le
 * namespace racine « App\ » et le dossier « app/ ».
 */
final class Autoloader
{
    private const PREFIX = 'App\\';

    public static function register(): void
    {
        spl_autoload_register([self::class, 'load']);
    }

    public static function load(string $class): void
    {
        if (!str_starts_with($class, self::PREFIX)) {
            return;
        }

        $relative = substr($class, strlen(self::PREFIX));
        $path = BASE_PATH . '/app/' . str_replace('\\', '/', $relative) . '.php';

        if (is_file($path)) {
            require $path;
        }
    }
}
