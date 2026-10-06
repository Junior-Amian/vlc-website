<?php

declare(strict_types=1);

namespace App\Controllers\Client;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Dossiers\DocumentStore;
use App\Dossiers\DossierView;
use App\Dossiers\Notifier;
use App\Dossiers\Onboarding;
use App\Dossiers\Process;
use App\Models\ChecklistItem;
use App\Models\Client;
use App\Models\Document;
use App\Models\Dossier;
use App\Models\DossierMessage;

/**
 * Le dossier du client connecté.
 *
 * Toutes les requêtes partent du client posé par AuthMiddleware : une pièce
 * ou un document d'un autre dossier répond « introuvable », exactement comme
 * un identifiant qui n'existe pas.
 */
final class DossierController extends Controller
{
    /** Tout ce que l'espace affiche, en un seul appel. */
    public function show(Request $request): Response
    {
        return Response::success($this->state($request->attribute('client')));
    }

    /** Formulaire d'ouverture de dossier, à la première connexion puis modifiable. */
    public function saveProfile(Request $request): Response
    {
        $client = $request->attribute('client');
        $answers = Onboarding::validate($request->input('answers'));

        $clients = new Client();
        $firstTime = $client['onboarded_at'] === null;

        $clients->update((string) $client['id'], [
            'profile'      => json_encode($answers, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'onboarded_at' => $client['onboarded_at'] ?? date('Y-m-d H:i:s'),
        ]);

        $dossiers = new Dossier();
        $dossier = $dossiers->findForClient((string) $client['id']);

        // Les informations reçues, le dossier passe de lui-même à l'étape
        // des documents. Les étapes suivantes sont avancées par l'équipe.
        if ($firstTime && $dossier !== null && (int) $dossier['step'] === Process::FIRST_STEP) {
            $dossiers->update((string) $dossier['id'], ['step' => Process::FIRST_STEP + 1, 'step_changed_at' => date('Y-m-d H:i:s')]);
        }

        return Response::success(
            $this->state($clients->find((string) $client['id'])),
            $firstTime ? 'Merci, votre dossier peut commencer.' : 'Informations enregistrées.'
        );
    }

    public function upload(Request $request): Response
    {
        $client = $request->attribute('client');
        $dossier = (new Dossier())->findForClient((string) $client['id']);
        $items = new ChecklistItem();
        $item = $dossier !== null ? $items->findInDossier($this->routeId($request), (string) $dossier['id']) : null;

        if ($item === null) {
            return Response::error('Pièce introuvable.', 404);
        }

        if ($item['status'] === 'validated') {
            return Response::error('Cette pièce est déjà validée par votre conseiller.', 409);
        }

        $stored = DocumentStore::store($request->files['file'] ?? null, (string) $dossier['id']);
        (new Document())->create(['checklist_item_id' => (string) $item['id'], ...$stored]);

        // Pièce manquante ou refusée : elle repasse « à vérifier ».
        $items->update((string) $item['id'], ['status' => 'received', 'rejection_reason' => null]);
        (new Dossier())->touch((string) $dossier['id']);

        // Accusé de réception au client, alerte à l'équipe (un de chaque par
        // quart d'heure, quel que soit le nombre de fichiers).
        Notifier::documentsUploaded($dossier, $client, [(string) $item['label']]);

        return Response::success($this->state($client), 'Document envoyé.', 201);
    }

    public function download(Request $request): Response
    {
        $document = $this->ownDocument($request);
        $path = $document !== null ? DocumentStore::path((string) $document['stored_name']) : null;

        if ($path === null) {
            return Response::error('Document introuvable.', 404);
        }

        return Response::file($path, (string) $document['original_name'], (string) $document['mime'], DocumentStore::VIEWABLE);
    }

    public function destroyDocument(Request $request): Response
    {
        $document = $this->ownDocument($request);

        if ($document === null) {
            return Response::error('Document introuvable.', 404);
        }

        if ($document['item_status'] === 'validated') {
            return Response::error('Ce document a été validé : demandez à votre conseiller avant de le retirer.', 409);
        }

        $documents = new Document();
        $documents->delete((string) $document['id']);
        DocumentStore::delete((string) $document['stored_name']);

        // Plus aucun fichier : la pièce redevient à fournir.
        if ($documents->forItem((string) $document['checklist_item_id']) === []) {
            (new ChecklistItem())->update((string) $document['checklist_item_id'], ['status' => 'missing']);
        }

        return Response::success($this->state($request->attribute('client')), 'Document retiré.');
    }

    /** @return array<string, mixed>|null */
    private function ownDocument(Request $request): ?array
    {
        $document = (new Document())->findWithOwner($this->routeId($request));
        $client = $request->attribute('client');

        return $document !== null && (string) $document['client_id'] === (string) $client['id'] ? $document : null;
    }

    /**
     * @param array<string, mixed> $client
     * @return array<string, mixed>
     */
    private function state(array $client): array
    {
        $dossier = (new Dossier())->findForClient((string) $client['id']);

        return [
            'client'         => Client::present($client),
            'dossier'        => $dossier !== null ? DossierView::forClient($dossier) : null,
            'onboarding'     => Onboarding::form(),
            'maxUploadBytes' => DocumentStore::MAX_BYTES,
            // Messages de l'équipe que le client n'a pas encore lus : le badge de l'onglet.
            'unreadMessages' => $dossier !== null
                ? (new DossierMessage())->unread((string) $dossier['id'], 'client', $dossier['client_read_at'])
                : 0,
        ];
    }
}
