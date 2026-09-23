<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Demande d'évaluation envoyée depuis le formulaire de contact public.
 */
final class Lead extends Model
{
    protected string $table = 'leads';

    protected array $fillable = [
        'full_name',
        'email',
        'phone',
        'project_type',
        'contact_preference',
        'message',
        'status',
        'source',
        'ip_address',
        'user_agent',
    ];

    /** Libellés lisibles pour les emails de notification. */
    public const PROJECT_LABELS = [
        'residence' => 'Résidence Permanente Canada',
        'travail'   => 'Contrat de Travail Canada (EIMT/LMIA)',
        'etudes'    => 'Visa Études (Canada, France, Europe)',
        'visiteur'  => 'Visa Visiteur & Tourisme (Schengen, etc.)',
        'affaires'  => 'Affaires & Courtage (Turquie, Chine)',
        'circuits'  => 'Circuits Touristiques & Billetterie',
    ];

    public const CONTACT_LABELS = [
        'whatsapp' => 'WhatsApp',
        'agence'   => 'En agence',
        'visio'    => 'Appel visio',
    ];

    public static function projectLabel(?string $key): string
    {
        return self::PROJECT_LABELS[$key] ?? 'Non précisé';
    }

    public static function contactLabel(?string $key): string
    {
        return self::CONTACT_LABELS[$key] ?? 'Non précisé';
    }
}
