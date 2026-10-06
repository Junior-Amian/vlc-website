<?php

declare(strict_types=1);

namespace App\Middleware;

/**
 * Limite d'envoi de documents par un client : 30 envois toutes les 10
 * minutes pour une même pièce (le compteur suit l'adresse de la route).
 * Large pour un dossier réel, photographié page par page ; un script ne
 * peut pas, lui, enchaîner envois et suppressions à l'infini.
 *
 * L'espace disque est borné par DocumentStore::MAX_FILES_PER_ITEM.
 */
final class UploadRateLimitMiddleware extends RateLimitMiddleware
{
    protected const MAX_ATTEMPTS = 30;
}
