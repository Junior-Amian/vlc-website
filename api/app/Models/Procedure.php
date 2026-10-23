<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Modèle de procédure : étapes du suivi et pièces à fournir, copiées dans
 * un dossier à son ouverture (voir App\Dossiers\ProcedureSchema).
 */
final class Procedure extends Model
{
    protected string $table = 'procedures';

    protected array $fillable = ['service', 'name', 'steps', 'checklist'];

    /** @return array<int, array<string, mixed>> Rangées par prestation, puis par nom. */
    public function allSorted(): array
    {
        return $this->db()
            ->query('SELECT * FROM `procedures` ORDER BY `service`, `name`, `created_at`')
            ->fetchAll();
    }

    /**
     * Forme envoyée au panel.
     *
     * @param array<string, mixed>  $row
     * @param array<string, string> $services Libellé de chaque prestation.
     * @return array<string, mixed>
     */
    public static function present(array $row, array $services): array
    {
        $slug = (string) $row['service'];

        return [
            'id'           => (string) $row['id'],
            'service'      => $slug,
            // Prestation retirée du site depuis : la procédure reste lisible.
            'serviceLabel' => $services[$slug] ?? ucfirst(str_replace('-', ' ', $slug)),
            'name'         => (string) $row['name'],
            'steps'        => self::decode($row['steps']),
            'checklist'    => self::decode($row['checklist']),
            'updatedAt'    => (string) $row['updated_at'],
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public static function decode(mixed $json): array
    {
        $value = json_decode((string) $json, true);

        return is_array($value) ? array_values($value) : [];
    }
}
