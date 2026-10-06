<?php

declare(strict_types=1);

namespace App\Dossiers;

use App\Core\Logger;
use App\Core\ValidationException;
use finfo;
use RuntimeException;

/**
 * Rangement des documents déposés dans l'espace client.
 *
 * Les fichiers vivent dans api/storage/documents, hors de la racine web :
 * aucun n'a d'adresse publique, ils ne sortent que par l'API, après
 * vérification du propriétaire. Chacun est enregistré sous un nom aléatoire
 * sans extension, dans un dossier par dossier client : rien du nom d'origine
 * n'atteint le disque, et rien ne peut y être exécuté.
 *
 * Formats libres (réponse du client du 03/10/2026), à l'exception des
 * programmes et des pages web, qui n'ont rien à faire dans un dossier de
 * visa et pourraient piéger l'équipe à l'ouverture.
 */
final class DocumentStore
{
    public const MAX_BYTES = 10 * 1024 * 1024;

    /**
     * Fichiers par pièce demandée : de quoi photographier un document page
     * par page, sans qu'un compte puisse remplir l'espace de l'hébergement.
     */
    public const MAX_FILES_PER_ITEM = 10;

    private const BLOCKED_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'php7', 'php8', 'phtml', 'phar', 'pht', 'phps',
        'exe', 'msi', 'com', 'bat', 'cmd', 'scr', 'pif', 'cpl', 'dll', 'sys',
        'js', 'mjs', 'jse', 'vbs', 'vbe', 'wsf', 'wsh', 'ps1', 'psm1', 'hta',
        'sh', 'bash', 'cgi', 'pl', 'py', 'rb', 'jar', 'apk', 'app', 'dmg',
        'html', 'htm', 'xhtml', 'shtml', 'svg', 'svgz', 'xml', 'htaccess', 'lnk',
    ];

    /** Types que le navigateur peut afficher sans danger plutôt que télécharger. */
    public const VIEWABLE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    public static function directory(): string
    {
        return BASE_PATH . '/storage/documents';
    }

    /**
     * Vérifie et range un fichier reçu.
     *
     * @param mixed $file Entrée de $_FILES.
     * @return array{original_name: string, stored_name: string, mime: string, size: int}
     * @throws ValidationException
     */
    public static function store(mixed $file, string $dossierId): array
    {
        if (!is_array($file) || !isset($file['tmp_name'], $file['error']) || is_array($file['tmp_name'])) {
            throw new ValidationException(['file' => ['Choisissez un fichier.']]);
        }

        $error = (int) $file['error'];

        if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE || (int) $file['size'] > self::MAX_BYTES) {
            throw new ValidationException(['file' => ['Fichier trop lourd : 10 Mo au maximum.']]);
        }

        if ($error !== UPLOAD_ERR_OK || !is_uploaded_file((string) $file['tmp_name'])) {
            throw new ValidationException(['file' => ['L\'envoi du fichier a échoué. Réessayez.']]);
        }

        if ((int) $file['size'] === 0) {
            throw new ValidationException(['file' => ['Ce fichier est vide.']]);
        }

        $originalName = self::cleanName((string) ($file['name'] ?? ''));
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        if (in_array($extension, self::BLOCKED_EXTENSIONS, true)) {
            throw new ValidationException(['file' => ['Ce type de fichier n\'est pas accepté. Envoyez une photo, un PDF ou un document.']]);
        }

        $mime = (string) (new finfo(FILEINFO_MIME_TYPE))->file((string) $file['tmp_name']);

        $directory = self::directory() . '/' . $dossierId;
        self::ensureDirectory($directory);

        $storedName = $dossierId . '/' . bin2hex(random_bytes(16));

        if (!move_uploaded_file((string) $file['tmp_name'], self::directory() . '/' . $storedName)) {
            Logger::error('Document non enregistré', ['directory' => $directory]);

            throw new RuntimeException('Le serveur n\'a pas pu enregistrer le fichier.', 503);
        }

        return [
            'original_name' => $originalName,
            'stored_name'   => $storedName,
            'mime'          => $mime !== '' ? $mime : 'application/octet-stream',
            'size'          => (int) $file['size'],
        ];
    }

    /** Chemin du fichier, ou null s'il a disparu ou sort du dossier des documents. */
    public static function path(string $storedName): ?string
    {
        $root = realpath(self::directory());
        $path = realpath(self::directory() . '/' . $storedName);

        if ($root === false || $path === false || !str_starts_with($path, $root . DIRECTORY_SEPARATOR) || !is_file($path)) {
            return null;
        }

        return $path;
    }

    public static function delete(string $storedName): void
    {
        $path = self::path($storedName);

        if ($path !== null) {
            @unlink($path);
        }
    }

    /** Efface tous les fichiers d'un dossier, puis son répertoire. */
    public static function deleteDossier(string $dossierId): void
    {
        $directory = self::directory() . '/' . $dossierId;

        foreach (glob($directory . '/*') ?: [] as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }

        if (is_dir($directory)) {
            @rmdir($directory);
        }
    }

    private static function ensureDirectory(string $directory): void
    {
        $root = self::directory();

        if (!is_dir($root)) {
            if (!@mkdir($root, 0750, true) && !is_dir($root)) {
                Logger::error('Dossier des documents non accessible en écriture', ['directory' => $root]);

                throw new RuntimeException('Le serveur ne peut pas enregistrer de fichier pour le moment.', 503);
            }

            // Filet de sécurité si l'hébergeur exposait un jour storage/.
            @file_put_contents($root . '/.htaccess', "Require all denied\n");
        }

        if (!is_dir($directory) && !@mkdir($directory, 0750) && !is_dir($directory)) {
            throw new RuntimeException('Le serveur ne peut pas enregistrer de fichier pour le moment.', 503);
        }
    }

    private static function cleanName(string $name): string
    {
        // Certains logiciels envoient le nom en Windows-1252 : converti, il
        // garde ses accents au lieu de faire échouer les expressions /u.
        if (!mb_check_encoding($name, 'UTF-8')) {
            $name = mb_convert_encoding($name, 'UTF-8', 'Windows-1252');
        }

        // Ni chemin, ni caractère de contrôle : seul le nom affiché compte.
        // (Pas de basename() : il dépend de la locale et coupe les accents.)
        $name = (string) preg_replace('#^.*[/\\\\]#u', '', $name);
        $name = (string) preg_replace('/[\x00-\x1F\x7F]+/u', '', $name);
        $name = trim($name);

        return mb_substr($name !== '' ? $name : 'document', -200);
    }
}
