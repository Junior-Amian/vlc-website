<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;
use RuntimeException;

/**
 * Connexion PDO partagée.
 *
 * La connexion est ouverte à la première requête seulement : les routes qui
 * ne touchent pas la base (health check, pages statiques) n'ouvrent donc
 * aucune connexion MySQL, ce qui compte sur un mutualisé où le nombre de
 * connexions simultanées est plafonné.
 */
final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $config = require BASE_PATH . '/config/database.php';

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );

        try {
            self::$connection = new PDO(
                $dsn,
                $config['username'],
                $config['password'],
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    // Indispensable : sans cela MySQL réinterprète les
                    // paramètres liés côté serveur et l'échappement perd de
                    // sa valeur sur certaines versions.
                    PDO::ATTR_EMULATE_PREPARES   => false,
                    PDO::ATTR_STRINGIFY_FETCHES  => false,
                ]
            );
        } catch (PDOException $e) {
            // Le message brut contient les identifiants : on le journalise
            // sans jamais le renvoyer au client.
            Logger::error('Connexion base de données impossible', ['exception' => $e->getMessage()]);

            throw new RuntimeException('Service temporairement indisponible.', 503, $e);
        }

        return self::$connection;
    }

    public static function reset(): void
    {
        self::$connection = null;
    }
}
