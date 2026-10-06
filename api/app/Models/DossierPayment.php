<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Versement reçu pour un dossier, en francs CFA. Un dossier peut en compter
 * plusieurs (réponse du client du 03/10/2026).
 */
final class DossierPayment extends Model
{
    protected string $table = 'dossier_payments';

    protected array $fillable = ['dossier_id', 'amount', 'paid_on', 'label', 'recorded_by'];

    /** @return array<int, array<string, mixed>> */
    public function forDossier(string $dossierId): array
    {
        $statement = $this->db()->prepare(
            'SELECT * FROM `dossier_payments` WHERE `dossier_id` = :dossier ORDER BY `paid_on`, `id`'
        );
        $statement->execute(['dossier' => $dossierId]);

        return $statement->fetchAll();
    }
}
