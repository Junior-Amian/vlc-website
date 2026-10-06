<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Dossiers\MessageThread;
use App\Dossiers\Notifier;
use App\Models\Client;
use App\Models\Dossier;

/**
 * Messagerie d'un dossier, côté équipe. Le fil est partagé : ce qu'un
 * administrateur lit est lu pour toute l'équipe.
 */
final class MessageController extends Controller
{
    /** Le fil ; l'ouvrir le marque comme lu pour l'équipe. */
    public function index(Request $request): Response
    {
        $dossier = (new Dossier())->find($this->routeId($request));

        if ($dossier === null) {
            return Response::error('Dossier introuvable.', 404);
        }

        (new Dossier())->markRead((string) $dossier['id'], 'team');

        return Response::success(MessageThread::messages((string) $dossier['id']));
    }

    public function store(Request $request): Response
    {
        $dossiers = new Dossier();
        $dossier = $dossiers->find($this->routeId($request));

        if ($dossier === null) {
            return Response::error('Dossier introuvable.', 404);
        }

        $admin = $request->attribute('admin');
        MessageThread::post((string) $dossier['id'], 'team', (string) $admin['id'], $request->input('body'));

        $dossiers->markRead((string) $dossier['id'], 'team');
        $dossiers->touch((string) $dossier['id']);

        $client = (new Client())->find((string) $dossier['client_id']);
        $active = $client !== null && Client::isActive($client);

        if ($active) {
            Notifier::teamMessaged($dossier, $client, explode(' ', trim((string) $admin['name']))[0]);
        }

        return Response::success(
            MessageThread::messages((string) $dossier['id']),
            $active
                ? 'Message envoyé : le client est prévenu par email.'
                : 'Message envoyé. Le client le lira une fois son espace activé.',
            201
        );
    }
}
