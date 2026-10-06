<?php

declare(strict_types=1);

namespace App\Analytics;

/**
 * Identifiant anonyme d'un visiteur pour la journée.
 *
 * Empreinte de l'adresse IP et du navigateur, salée par une clé aléatoire
 * propre à chaque jour. La clé de la veille est effacée : passé minuit, plus
 * personne, administrateur compris, ne peut relier une empreinte à une
 * adresse IP, ni rapprocher deux journées d'un même visiteur. L'adresse IP
 * elle-même n'est jamais enregistrée.
 */
final class VisitorId
{
    private const DIRECTORY = '/storage/cache/analytics';

    public static function for(string $ip, string $userAgent): string
    {
        return substr(hash('sha256', self::dailySalt() . '|' . $ip . '|' . $userAgent), 0, 16);
    }

    private static function dailySalt(): string
    {
        $directory = BASE_PATH . self::DIRECTORY;
        $file = $directory . '/salt-' . date('Ymd') . '.key';

        if (is_file($file)) {
            $salt = (string) file_get_contents($file);

            if ($salt !== '') {
                return $salt;
            }
        }

        if (!is_dir($directory) && !@mkdir($directory, 0750, true) && !is_dir($directory)) {
            // Stockage indisponible : une clé éphémère vaut mieux qu'une clé
            // fixe, quitte à compter un même visiteur plusieurs fois.
            return bin2hex(random_bytes(16));
        }

        // Création exclusive (« x ») : deux requêtes simultanées ne peuvent
        // pas écrire chacune leur clé ; la seconde relit celle de la première.
        $handle = @fopen($file, 'x');

        if ($handle === false) {
            return (string) file_get_contents($file) ?: bin2hex(random_bytes(16));
        }

        $salt = bin2hex(random_bytes(16));
        fwrite($handle, $salt);
        fclose($handle);

        self::forgetOldSalts($directory, $file);

        return $salt;
    }

    private static function forgetOldSalts(string $directory, string $current): void
    {
        foreach (glob($directory . '/salt-*.key') ?: [] as $file) {
            if ($file !== $current) {
                @unlink($file);
            }
        }
    }
}
