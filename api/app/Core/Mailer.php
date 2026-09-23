<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Envoi d'emails via la fonction mail() de PHP.
 *
 * C'est le seul mécanisme disponible partout sur un hébergement mutualisé.
 * Le jour où le volume le justifie, seule cette classe est à remplacer par
 * un transport SMTP — les appelants ne changent pas.
 */
final class Mailer
{
    public static function send(string $to, string $subject, string $htmlBody, ?string $replyTo = null): bool
    {
        $config = require BASE_PATH . '/config/app.php';

        $fromAddress = (string) $config['mail']['from_address'];
        $fromName = (string) $config['mail']['from_name'];

        if (filter_var($to, FILTER_VALIDATE_EMAIL) === false) {
            Logger::warning('Destinataire email invalide', ['to' => $to]);

            return false;
        }

        // Un retour à la ligne dans l'un de ces champs permettrait d'injecter
        // des en-têtes arbitraires (Bcc, etc.) : on les neutralise.
        $subject = self::sanitizeHeader($subject);
        $fromName = self::sanitizeHeader($fromName);

        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . sprintf('=?UTF-8?B?%s?= <%s>', base64_encode($fromName), $fromAddress),
            'X-Mailer: PHP/' . PHP_VERSION,
        ];

        if ($replyTo !== null && filter_var($replyTo, FILTER_VALIDATE_EMAIL) !== false) {
            $headers[] = 'Reply-To: ' . $replyTo;
        }

        if ($config['mail']['transport'] === 'log') {
            return self::writeToLog($to, $subject, $htmlBody, $headers);
        }

        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

        $sent = @mail($to, $encodedSubject, $htmlBody, implode("\r\n", $headers), '-f' . $fromAddress);

        if (!$sent) {
            Logger::error('Échec de l\'envoi email', ['to' => $to, 'subject' => $subject]);
        }

        return $sent;
    }

    /** @param string[] $headers */
    private static function writeToLog(string $to, string $subject, string $htmlBody, array $headers): bool
    {
        $directory = BASE_PATH . '/storage/logs';

        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            return false;
        }

        $entry = sprintf(
            "===== %s\nTo: %s\nSubject: %s\n%s\n\n%s\n\n",
            date('Y-m-d H:i:s'),
            $to,
            $subject,
            implode("\n", $headers),
            $htmlBody
        );

        return @file_put_contents($directory . '/mail-' . date('Y-m-d') . '.log', $entry, FILE_APPEND | LOCK_EX) !== false;
    }

    private static function sanitizeHeader(string $value): string
    {
        return trim(str_replace(["\r", "\n", "%0a", "%0d"], '', $value));
    }

    /** @param array<string, string> $rows */
    public static function layout(string $title, string $intro, array $rows = []): string
    {
        $html = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>'
            . '<body style="margin:0;padding:24px;background:#f1f4fc;font-family:Arial,Helvetica,sans-serif;color:#111c2d;">'
            . '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8eef9;">'
            . '<div style="background:#00142f;padding:24px;">'
            . '<h1 style="margin:0;font-size:18px;color:#ffffff;">VISILION CORPORATE</h1>'
            . '<p style="margin:4px 0 0;font-size:12px;color:#ff9829;font-style:italic;">Notre vision, votre satisfaction</p>'
            . '</div><div style="padding:24px;">'
            . '<h2 style="margin:0 0 12px;font-size:16px;color:#00142f;">' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h2>'
            . '<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#4d5868;">' . nl2br(htmlspecialchars($intro, ENT_QUOTES, 'UTF-8')) . '</p>';

        if ($rows !== []) {
            $html .= '<table style="width:100%;border-collapse:collapse;font-size:14px;">';

            foreach ($rows as $label => $value) {
                $html .= '<tr>'
                    . '<td style="padding:8px 0;color:#4d5868;width:40%;vertical-align:top;">' . htmlspecialchars((string) $label, ENT_QUOTES, 'UTF-8') . '</td>'
                    . '<td style="padding:8px 0;color:#111c2d;font-weight:bold;">' . nl2br(htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8')) . '</td>'
                    . '</tr>';
            }

            $html .= '</table>';
        }

        return $html . '</div></div></body></html>';
    }
}
