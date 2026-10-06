<?php

declare(strict_types=1);

namespace App\Dossiers;

use App\Core\ValidationException;
use App\Models\DossierMessage;

/**
 * Fil de messages d'un dossier, commun à l'espace client et au panel :
 * même validation, même forme de réponse des deux côtés.
 */
final class MessageThread
{
    /** @return array<int, array<string, mixed>> */
    public static function messages(string $dossierId): array
    {
        return array_map([DossierMessage::class, 'present'], (new DossierMessage())->forDossier($dossierId));
    }

    /**
     * Ajoute un message au fil.
     *
     * @param 'client'|'team' $author
     * @throws ValidationException
     */
    public static function post(string $dossierId, string $author, ?string $adminId, mixed $body): void
    {
        $body = is_string($body) ? trim(str_replace("\r\n", "\n", $body)) : '';

        if ($body === '') {
            throw new ValidationException(['body' => ['Écrivez votre message.']]);
        }

        if (mb_strlen($body) > DossierMessage::MAX_LENGTH) {
            throw new ValidationException(['body' => [sprintf('%d caractères au maximum.', DossierMessage::MAX_LENGTH)]]);
        }

        (new DossierMessage())->create([
            'dossier_id' => $dossierId,
            'author'     => $author,
            'admin_id'   => $adminId,
            'body'       => $body,
        ]);
    }
}
