<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Auth\AdminSession;
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
    public function login(Request $request): Response
    {
        $data = $this->validate($request, [
            'email'    => 'required|email|max:180',
            'password' => 'required|string|max:200',
        ], ['email' => 'adresse email', 'password' => 'mot de passe']);

        $admins = new Admin();
        $admin = $admins->findByEmail((string) $data['email']);

        // Un hachage est vérifié même quand le compte n'existe pas : sans
        // cela, la durée de la réponse révélerait les adresses enregistrées.
        $hash = $admin['password_hash'] ?? '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';

        if (!password_verify((string) $data['password'], (string) $hash) || $admin === null) {
            return Response::error('Email ou mot de passe incorrect.', 401);
        }

        $id = (string) $admin['id'];

        if (password_needs_rehash((string) $admin['password_hash'], PASSWORD_DEFAULT)) {
            $admins->update($id, ['password_hash' => password_hash((string) $data['password'], PASSWORD_DEFAULT)]);
        }

        $admins->update($id, ['last_login_at' => date('Y-m-d H:i:s')]);

        return AdminSession::start(Response::success(Admin::present($admin)), $admin);
    }

    public function logout(Request $request): Response
    {
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
