<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Identifiants UUID version 4 (aléatoires), ceux des tables de l'application.
 *
 * Générés en PHP : la fonction UUID() de MariaDB produit des UUID version 1,
 * dérivés de l'horloge et de l'adresse de la machine. Un v4 ne révèle rien :
 * ni l'ordre de création, ni le nombre de lignes, ni le serveur.
 *
 * Stockés en CHAR(36) ASCII : lisibles tels quels dans phpMyAdmin.
 */
final class Uuid
{
    private const PATTERN = '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/';

    public static function v4(): string
    {
        $bytes = random_bytes(16);

        // Version 4 (quartet de poids fort du 7e octet), variante RFC 4122
        // (deux bits de poids fort du 9e octet à 10).
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    /** Un identifiant reçu (adresse, corps JSON, jeton) a-t-il la forme d'un UUID v4 ? */
    public static function isValid(mixed $value): bool
    {
        return is_string($value) && preg_match(self::PATTERN, $value) === 1;
    }
}
