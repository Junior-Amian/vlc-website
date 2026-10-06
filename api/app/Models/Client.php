<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Compte de l'espace client. Créé par l'équipe avec le dossier ; le client
 * l'active en choisissant son mot de passe depuis le lien d'invitation.
 */
final class Client extends Model
{
    protected string $table = 'clients';

    protected array $fillable = ['email', 'full_name', 'phone', 'profile', 'onboarded_at', 'last_login_at'];

    /** @return array<string, mixed>|null */
    public function findByEmail(string $email): ?array
    {
        return $this->findBy('email', mb_strtolower(trim($email)));
    }

    public function setPassword(string $id, string $hash): void
    {
        // Comme pour les administrateurs, token_version n'est pas
        // « fillable » : il ne s'incrémente qu'ici.
        $this->db()
            ->prepare('UPDATE `clients` SET `password_hash` = :hash, `token_version` = `token_version` + 1 WHERE `id` = :id')
            ->execute(['hash' => $hash, 'id' => $id]);
    }

    /** @param array<string, mixed> $client */
    public static function isActive(array $client): bool
    {
        return $client['password_hash'] !== null;
    }

    /**
     * Réponses du formulaire d'ouverture de dossier.
     *
     * @param array<string, mixed> $client
     * @return array<string, string>
     */
    public static function profile(array $client): array
    {
        $profile = json_decode((string) ($client['profile'] ?? ''), true);

        return is_array($profile) ? $profile : [];
    }

    /**
     * Le compte tel que l'espace client le voit : jamais le hachage.
     *
     * @param array<string, mixed> $client
     * @return array<string, mixed>
     */
    public static function present(array $client): array
    {
        return [
            'id'        => (string) $client['id'],
            'fullName'  => (string) $client['full_name'],
            'email'     => (string) $client['email'],
            'phone'     => (string) $client['phone'],
            'onboarded' => $client['onboarded_at'] !== null,
            'profile'   => (object) self::profile($client),
        ];
    }
}
