<?php

declare(strict_types=1);

namespace App\Dossiers;

use App\Core\Mailer;

/**
 * Envoi des emails de l'espace client, au client comme à l'équipe.
 *
 * Les emails ne contiennent jamais le contenu sensible d'un dossier (pièces,
 * messages) : ils annoncent qu'il se passe quelque chose et mènent à
 * l'espace, où il faut être connecté. Un email peut être transféré, lu par
 * quelqu'un d'autre, ou finir dans une boîte mal protégée.
 */
final class DossierMail
{
    /**
     * @param array<string, mixed>                    $client
     * @param array{label: string, url: string}|null $action
     */
    public static function toClient(array $client, string $subject, string $title, string $intro, ?array $action = null, string $footnote = ''): bool
    {
        return Mailer::send(
            (string) $client['email'],
            $subject,
            Mailer::layout($title, $intro, [], $action, $footnote),
            self::teamAddress()
        );
    }

    /**
     * @param array<string, string>                   $rows
     * @param array{label: string, url: string}|null $action
     */
    public static function toTeam(string $subject, string $title, string $intro, array $rows = [], ?array $action = null): bool
    {
        return Mailer::send(self::teamAddress(), $subject, Mailer::layout($title, $intro, $rows, $action));
    }

    /** Adresse complète d'une page du site : « /espace-client/documents ». */
    public static function url(string $path): string
    {
        $config = require BASE_PATH . '/config/app.php';

        return rtrim((string) $config['url'], '/') . $path;
    }

    /** @param array<string, mixed> $client */
    public static function firstName(array $client): string
    {
        return explode(' ', trim((string) $client['full_name']))[0] ?: (string) $client['full_name'];
    }

    /** Adresse de l'équipe pour l'espace client (MAIL_DOSSIERS_ADDRESS, fictive pour l'instant). */
    private static function teamAddress(): string
    {
        $config = require BASE_PATH . '/config/app.php';

        return (string) $config['mail']['dossiers_address'];
    }
}
