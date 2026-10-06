<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Auth\AdminSession;
use App\Auth\LoginThrottle;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\ValidationException;
use App\Models\Admin;

/**
 * Connexion, déconnexion et mot de passe des administrateurs.
 */
final class AuthController extends Controller
{
    /** Compteur d'échecs propre au panel (voir LoginThrottle). */
    private const THROTTLE = 'admin';

    public function login(Request $request): Response
    {
        $data = $this->validate($request, [
            'email'    => 'required|email|max:180',
            'password' => 'required|string|max:200',
        ], ['email' => 'adresse email', 'password' => 'mot de passe']);

        $email = (string) $data['email'];

        // Vérifié avant le mot de passe : pendant le blocage, même le bon mot
        // de passe est refusé, sinon l'attaquant saurait qu'il l'a trouvé.
        $retryAfter = LoginThrottle::retryAfter(self::THROTTLE, $email);

        if ($retryAfter !== null) {
            return LoginThrottle::response($retryAfter);
        }

        $admins = new Admin();
        $admin = $admins->findByEmail($email);

        // Un hachage est vérifié même quand le compte n'existe pas : sans
        // cela, la durée de la réponse révélerait les adresses enregistrées.
        $hash = $admin['password_hash'] ?? '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';

        if (!password_verify((string) $data['password'], (string) $hash) || $admin === null) {
            LoginThrottle::recordFailure(self::THROTTLE, $email);

            return Response::error('Email ou mot de passe incorrect.', 401);
        }

        LoginThrottle::clear(self::THROTTLE, $email);
        $id = (string) $admin['id'];

        if (password_needs_rehash((string) $admin['password_hash'], PASSWORD_DEFAULT)) {
            $admins->update($id, ['password_hash' => password_hash((string) $data['password'], PASSWORD_DEFAULT)]);
        }

        $admins->update($id, ['last_login_at' => date('Y-m-d H:i:s')]);

        return AdminSession::start(Response::success(Admin::present($admin)), $admin);
    }

    /**
     * Ferme la session ici et sur tous les appareils : le jeton reste
     * valide jusqu'à son expiration, seul le changement de version de
     * compte l'invalide côté serveur (voir AdminAuthMiddleware).
     */
    public function logout(Request $request): Response
    {
        (new Admin())->revokeSessions((string) $request->attribute('admin')['id']);

        return AdminSession::end(Response::success());
    }

    public function me(Request $request): Response
    {
        return Response::success(Admin::present($request->attribute('admin')));
    }

    public function changePassword(Request $request): Response
    {
        $data = $this->validate($request, [
            'current_password' => 'required|string|max:200',
            // Aucune règle de longueur ni de composition, à la demande du client.
            'password'         => 'required|string|max:200|confirmed',
        ], ['current_password' => 'mot de passe actuel', 'password' => 'nouveau mot de passe']);

        $admin = $request->attribute('admin');

        if (!password_verify((string) $data['current_password'], (string) $admin['password_hash'])) {
            throw new ValidationException(['current_password' => ['Le mot de passe actuel est incorrect.']]);
        }

        $admins = new Admin();
        $admins->changePassword((string) $admin['id'], password_hash((string) $data['password'], PASSWORD_DEFAULT));

        // Les autres sessions sont fermées par le changement de version ; on
        // rouvre aussitôt celle-ci pour ne pas déconnecter l'auteur du changement.
        $updated = $admins->find((string) $admin['id']) ?? $admin;

        return AdminSession::start(Response::success(null, 'Mot de passe modifié.'), $updated);
    }
}
