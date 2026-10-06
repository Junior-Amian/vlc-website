<?php

declare(strict_types=1);

namespace App\Middleware;

/**
 * Limite d'envoi de messages par un client : 20 toutes les 10 minutes. Large
 * pour une vraie conversation, mais un script ne peut pas inonder l'équipe
 * de messages, ni d'emails.
 */
final class MessageRateLimitMiddleware extends RateLimitMiddleware
{
    protected const MAX_ATTEMPTS = 20;
}
