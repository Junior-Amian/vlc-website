<?php

declare(strict_types=1);

namespace App\Controllers\Client;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Dossiers\MessageThread;
use App\Dossiers\Notifier;
use App\Models\Dossier;

/**
 * Messagerie du client avec l'équipe, sur son dossier.
 */
final class MessageController extends Controller
{
    /** Le fil ; l'ouvrir le marque comme lu. */
    public function index(Request $request): Response
    {
        $dossier = $this->dossier($request);

        if ($dossier === null) {
            return Response::error('Votre dossier n\'est pas encore disponible.', 404);
        }

        (new Dossier())->markRead((string) $dossier['id'], 'client');

        return Response::success(MessageThread::messages((string) $dossier['id']));
    }

    public function store(Request $request): Response
    {
        $client = $request->attribute('client');
        $dossier = $this->dossier($request);

        if ($dossier === null) {
            return Response::error('Votre dossier n\'est pas encore disponible.', 404);
        }

        MessageThread::post((string) $dossier['id'], 'client', null, $request->input('body'));

        $dossiers = new Dossier();
        $dossiers->markRead((string) $dossier['id'], 'client');
        $dossiers->touch((string) $dossier['id']);
        Notifier::clientMessaged($dossier, $client);

        return Response::success(MessageThread::messages((string) $dossier['id']), 'Message envoyé.', 201);
    }

    /** @return array<string, mixed>|null */
    private function dossier(Request $request): ?array
    {
        return (new Dossier())->findForClient((string) $request->attribute('client')['id']);
    }
}
