<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Lecture et réécriture d'un petit fichier sous verrou exclusif.
 *
 * Les compteurs de tentatives (LoginThrottle, RateLimitMiddleware) étaient
 * lus sans verrou puis réécrits : des requêtes simultanées lisaient toutes
 * le même compte, passaient toutes le contrôle et s'écrasaient l'une
 * l'autre (audit de sécurité du 22/10/2026). Ici, lecture, décision et
 * écriture se font sous un seul verrou : les requêtes passent l'une après
 * l'autre.
 */
final class LockedFile
{
    /**
     * @param callable(string): array{0: mixed, 1: ?string} $update
     *        Reçoit le contenu actuel ('' pour un fichier neuf) et renvoie
     *        [résultat, nouveau contenu], ou [résultat, null] pour n'écrire rien.
     *
     * Si le fichier ne peut pas être ouvert, $update reçoit '' et rien n'est
     * écrit : le compteur se comporte comme vide, ce qui reprend le choix de
     * ses appelants de laisser passer quand le stockage fait défaut.
     */
    public static function update(string $path, callable $update): mixed
    {
        // Deux essais : une purge a pu supprimer le fichier pendant qu'on
        // attendait le verrou ; on écrirait alors dans un fichier détaché.
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $handle = @fopen($path, 'c+');

            if ($handle === false) {
                break;
            }

            try {
                if (!flock($handle, LOCK_EX)) {
                    break;
                }

                if ((fstat($handle)['nlink'] ?? 1) === 0) {
                    continue;
                }

                $contents = stream_get_contents($handle);
                [$result, $next] = $update($contents === false ? '' : $contents);

                if ($next !== null) {
                    ftruncate($handle, 0);
                    rewind($handle);
                    fwrite($handle, $next);
                    fflush($handle);
                }

                return $result;
            } finally {
                flock($handle, LOCK_UN);
                fclose($handle);
            }
        }

        return $update('')[0];
    }
}
