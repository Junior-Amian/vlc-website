<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Compte d'accès au panel d'administration.
 *
 * Les comptes se créent en ligne de commande (bin/create-admin.php) ou par
 * phpMyAdmin : le panel ne permet pas d'en créer, pour qu'une session volée
 * ne puisse pas s'ouvrir un accès durable.
 */
final class Admin extends Model
{
    protected string $table = 'admins';

    protected array $fillable = ['name', 'email', 'password_hash', 'last_login_at'];

    /** @return array<string, mixed>|null */
    public function findByEmail(string $email): ?array
    {
        return $this->findBy('email', mb_strtolower(trim($email)));
    }

    public function changePassword(string $id, string $hash): void
    {
        // token_version n'est pas « fillable » : il ne s'incrémente qu'ici,
        // jamais à partir d'une charge envoyée par le client.
        $this->db()
            ->prepare('UPDATE `admins` SET `password_hash` = :hash, `token_version` = `token_version` + 1 WHERE `id` = :id')
            ->execute(['hash' => $hash, 'id' => $id]);
    }

    /**
     * Données exposées au panel : jamais le hachage du mot de passe.
     *
     * @param array<string, mixed> $admin
     * @return array{id: int, name: string, email: string}
     */
    public static function present(array $admin): array
    {
        return [
            'id'    => (string) $admin['id'],
            'name'  => (string) $admin['name'],
            'email' => (string) $admin['email'],
        ];
    }
}
