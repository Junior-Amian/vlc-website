<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Liens à usage unique de l'espace client : invitation (choisir son premier
 * mot de passe) et mot de passe oublié.
 *
 * Le jeton n'est jamais conservé en clair, seulement son empreinte : la
 * base seule ne permet d'ouvrir aucun compte.
 */
final class ClientToken extends Model
{
    protected string $table = 'client_tokens';

    protected array $fillable = ['client_id', 'type', 'token_hash', 'expires_at', 'used_at'];

    /** Durée de validité, en secondes, de chaque type de lien. */
    public const LIFETIME = [
        // Une semaine : le client ne lit pas forcément ses emails le jour même.
        'invite' => 7 * 24 * 3600,
        'reset'  => 3600,
    ];

    /**
     * Crée un lien et rend le jeton en clair, à placer dans l'adresse.
     *
     * $revokePrevious : les liens du même type encore valides pour ce client
     * sont annulés, seul le dernier envoyé fonctionne. C'est le cas quand
     * l'équipe renvoie une invitation. Une demande faite depuis la page
     * publique (« mot de passe oublié » sur un compte pas encore activé) les
     * laisse valables : n'importe qui connaissant l'email pourrait sinon
     * annuler le lien que l'équipe a transmis au client.
     */
    public function issue(string $clientId, string $type, bool $revokePrevious = true): string
    {
        if ($revokePrevious) {
            $this->db()
                ->prepare('UPDATE `client_tokens` SET `used_at` = NOW() WHERE `client_id` = :client AND `type` = :type AND `used_at` IS NULL')
                ->execute(['client' => $clientId, 'type' => $type]);
        }

        $token = bin2hex(random_bytes(32));

        $this->create([
            'client_id'  => $clientId,
            'type'       => $type,
            'token_hash' => hash('sha256', $token),
            'expires_at' => date('Y-m-d H:i:s', time() + self::LIFETIME[$type]),
        ]);

        return $token;
    }

    /**
     * Le lien et son client, s'il est encore utilisable.
     *
     * @return array<string, mixed>|null
     */
    public function findUsable(string $token): ?array
    {
        if (preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
            return null;
        }

        $statement = $this->db()->prepare(
            'SELECT t.`id` AS token_id, t.`type`, c.*
             FROM `client_tokens` t
             JOIN `clients` c ON c.`id` = t.`client_id`
             WHERE t.`token_hash` = :hash AND t.`used_at` IS NULL AND t.`expires_at` > NOW()
             LIMIT 1'
        );
        $statement->execute(['hash' => hash('sha256', $token)]);

        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    /**
     * Annule tous les liens encore valables du client, quel que soit leur
     * type. Appelé dès qu'il choisit un mot de passe : un ancien lien
     * d'invitation resté dans une conversation ne doit plus permettre de le
     * changer.
     */
    public function revokeAll(string $clientId): void
    {
        $this->db()
            ->prepare('UPDATE `client_tokens` SET `used_at` = NOW() WHERE `client_id` = :client AND `used_at` IS NULL')
            ->execute(['client' => $clientId]);
    }

    /** Date d'expiration de la dernière invitation en attente, ou null. */
    public function pendingInvitation(string $clientId): ?string
    {
        $statement = $this->db()->prepare(
            'SELECT `expires_at` FROM `client_tokens`
             WHERE `client_id` = :client AND `type` = \'invite\' AND `used_at` IS NULL AND `expires_at` > NOW()
             ORDER BY `created_at` DESC, `id` DESC LIMIT 1'
        );
        $statement->execute(['client' => $clientId]);

        $value = $statement->fetchColumn();

        return $value === false ? null : (string) $value;
    }
}
