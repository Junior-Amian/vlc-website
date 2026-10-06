<?php

declare(strict_types=1);

namespace App\Controllers\Client;

use App\Auth\ClientSession;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Dossiers\ClientAccess;
use App\Models\Client;
use App\Models\ClientToken;

/**
 * Accès à l'espace client : connexion, invitation, mot de passe oublié.
 *
 * Aucune réponse ne révèle si une adresse a un compte : la connexion
 * échoue avec le même message, et « mot de passe oublié » répond toujours
 * la même chose.
 */
final class AuthController extends Controller
{
    /**
     * Au moins 8 caractères : le compte protège des pièces d'identité. (Le
     * panel n'a pas de règle, à la demande du client ; ici, c'est à valider.)
     */
    private const PASSWORD_RULES = 'required|string|min:8|max:200|confirmed';

    public function login(Request $request): Response
    {
        $data = $this->validate($request, [
            'email'    => 'required|email|max:180',
            'password' => 'required|string|max:200',
        ], ['email' => 'adresse email', 'password' => 'mot de passe']);

        $clients = new Client();
        $client = $clients->findByEmail((string) $data['email']);

        // Hachage vérifié même sans compte : la durée de la réponse ne doit
        // pas révéler les adresses enregistrées (voir Admin\AuthController).
        $hash = $client['password_hash'] ?? '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';

        if (!password_verify((string) $data['password'], (string) $hash) || $client === null || !Client::isActive($client)) {
            return Response::error('Email ou mot de passe incorrect.', 401);
        }

        $id = (string) $client['id'];

        if (password_needs_rehash((string) $client['password_hash'], PASSWORD_DEFAULT)) {
            $clients->setPassword($id, password_hash((string) $data['password'], PASSWORD_DEFAULT));
            $client = $clients->find($id) ?? $client;
        }

        $clients->update($id, ['last_login_at' => date('Y-m-d H:i:s')]);

        return ClientSession::start(Response::success(Client::present($client)), $client);
    }

    public function logout(Request $request): Response
    {
        return ClientSession::end(Response::success());
    }

    public function forgotPassword(Request $request): Response
    {
        $data = $this->validate($request, ['email' => 'required|email|max:180'], ['email' => 'adresse email']);
        $client = (new Client())->findByEmail((string) $data['email']);

        // Un compte jamais activé reçoit une nouvelle invitation : c'est ce
        // dont le client a besoin, même s'il ne le formule pas ainsi.
        if ($client !== null && Client::isActive($client)) {
            ClientAccess::sendReset($client);
        } elseif ($client !== null) {
            ClientAccess::invite($client);
        }

        return Response::success(
            null,
            'Si un compte existe pour cette adresse, un email vient de lui être envoyé. Pensez à regarder dans les courriers indésirables.'
        );
    }

    /** Le lien d'invitation ou de mot de passe est-il encore valable ? */
    public function checkAccess(Request $request): Response
    {
        $access = (new ClientToken())->findUsable((string) $request->input('token', ''));

        if ($access === null) {
            return $this->expired();
        }

        return Response::success([
            'type'     => (string) $access['type'],
            'fullName' => (string) $access['full_name'],
            'email'    => (string) $access['email'],
        ]);
    }

    /** Choisit le mot de passe depuis le lien, puis ouvre la session. */
    public function setPassword(Request $request): Response
    {
        $data = $this->validate($request, [
            'token'    => 'required|string|max:64',
            'password' => self::PASSWORD_RULES,
        ], ['password' => 'mot de passe']);

        $tokens = new ClientToken();
        $access = $tokens->findUsable((string) $data['token']);

        if ($access === null) {
            return $this->expired();
        }

        $clients = new Client();
        $id = (string) $access['id'];

        $clients->setPassword($id, password_hash((string) $data['password'], PASSWORD_DEFAULT));
        $tokens->markUsed((string) $access['token_id']);
        $clients->update($id, ['last_login_at' => date('Y-m-d H:i:s')]);

        $client = $clients->find($id);

        return ClientSession::start(
            Response::success(Client::present($client), $access['type'] === 'invite' ? 'Votre espace est prêt.' : 'Mot de passe modifié.'),
            $client
        );
    }

    private function expired(): Response
    {
        return Response::error(
            'Ce lien n\'est plus valable : il a déjà servi ou il a expiré. Demandez-en un nouveau ci-dessous, ou contactez votre conseiller.',
            410
        );
    }
}
