<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Uuid;
use App\Core\ValidationException;
use App\Dossiers\DocumentStore;
use App\Dossiers\DossierView;
use App\Dossiers\Notifier;
use App\Models\Client;
use App\Models\ChecklistItem;
use App\Models\Document;
use App\Models\Dossier;

/**
 * Pièces à fournir d'un dossier et documents déposés, côté panel : ajuster
 * la liste, valider ou refuser une pièce, consulter les fichiers.
 *
 * Chaque modification renvoie le dossier entier : le panel remplace sa copie
 * d'un bloc, sans recalculer lui-même compteurs et états.
 */
final class ChecklistController extends Controller
{
    private const LABELS = ['label' => 'intitulé', 'help' => 'précision', 'rejection_reason' => 'motif'];

    public function store(Request $request): Response
    {
        $dossier = $this->dossier($this->routeId($request));

        if ($dossier === null) {
            return Response::error('Dossier introuvable.', 404);
        }

        $data = $this->validate($request, [
            'label'    => 'required|string|max:160',
            'help'     => 'string|max:300',
            'required' => 'boolean',
        ], self::LABELS);

        $items = new ChecklistItem();
        $items->create([
            'dossier_id' => (string) $dossier['id'],
            'label'      => $data['label'],
            'help'       => (string) ($data['help'] ?? ''),
            'required'   => $this->flag($data['required'] ?? true),
            'position'   => $items->nextPosition((string) $dossier['id']),
        ]);

        return $this->respond((string) $dossier['id'], 'Pièce ajoutée.');
    }

    public function update(Request $request): Response
    {
        $items = new ChecklistItem();
        $item = $items->find($this->routeId($request));

        if ($item === null) {
            return Response::error('Pièce introuvable.', 404);
        }

        $data = $this->validate($request, [
            'label'            => 'string|max:160',
            'help'             => 'string|max:300',
            'required'         => 'boolean',
            'status'           => 'in:' . implode(',', ChecklistItem::STATUSES),
            'rejection_reason' => 'string|max:300',
        ], self::LABELS);

        $sent = static fn (string $key): bool => array_key_exists($key, $request->body);
        $changes = [];

        if ($sent('label')) {
            if ($data['label'] === null) {
                throw new ValidationException(['label' => ['Le champ intitulé est obligatoire.']]);
            }

            $changes['label'] = $data['label'];
        }

        if ($sent('help')) {
            $changes['help'] = (string) ($data['help'] ?? '');
        }

        if ($sent('required')) {
            $changes['required'] = $this->flag($data['required']);
        }

        if ($sent('status') && $data['status'] !== null) {
            $changes['status'] = $data['status'];
            $changes['rejection_reason'] = null;

            if ($data['status'] === 'rejected') {
                // Le client doit savoir quoi refaire : pas de refus sans motif.
                if ($data['rejection_reason'] === null) {
                    throw new ValidationException(['rejection_reason' => ['Indiquez au client ce qui ne va pas.']]);
                }

                $changes['rejection_reason'] = $data['rejection_reason'];
            }
        }

        if ($changes !== []) {
            $items->update((string) $item['id'], $changes);
        }

        // Pièce refusée : le client est prévenu par email, motif compris.
        if (($changes['status'] ?? null) === 'rejected') {
            $dossier = (new Dossier())->find((string) $item['dossier_id']);
            $client = $dossier !== null ? (new Client())->find((string) $dossier['client_id']) : null;

            if ($client !== null) {
                Notifier::itemRejected($dossier, $client, (string) ($changes['label'] ?? $item['label']), (string) $changes['rejection_reason']);
            }
        }

        $message = match ($changes['status'] ?? null) {
            'validated' => 'Pièce validée.',
            'rejected'  => 'Pièce refusée : le client voit le motif et le reçoit par email.',
            default     => 'Pièce mise à jour.',
        };

        return $this->respond((string) $item['dossier_id'], $message);
    }

    public function destroy(Request $request): Response
    {
        $items = new ChecklistItem();
        $item = $items->find($this->routeId($request));

        if ($item === null) {
            return Response::error('Pièce introuvable.', 404);
        }

        foreach ((new Document())->forItem((string) $item['id']) as $document) {
            DocumentStore::delete((string) $document['stored_name']);
        }

        $items->delete((string) $item['id']);

        return $this->respond((string) $item['dossier_id'], 'Pièce retirée de la liste.');
    }

    public function reorder(Request $request): Response
    {
        $dossier = $this->dossier($this->routeId($request));
        $ids = $request->input('ids');

        if ($dossier === null) {
            return Response::error('Dossier introuvable.', 404);
        }

        if (!is_array($ids)) {
            throw new ValidationException(['ids' => ['Ordre des pièces manquant.']]);
        }

        (new ChecklistItem())->reorder((string) $dossier['id'], array_filter($ids, [Uuid::class, 'isValid']));

        return $this->respond((string) $dossier['id'], 'Ordre enregistré.');
    }

    public function download(Request $request): Response
    {
        $document = (new Document())->find($this->routeId($request));
        $path = $document !== null ? DocumentStore::path((string) $document['stored_name']) : null;

        if ($path === null) {
            return Response::error('Document introuvable.', 404);
        }

        return Response::file($path, (string) $document['original_name'], (string) $document['mime'], DocumentStore::VIEWABLE);
    }

    public function destroyDocument(Request $request): Response
    {
        $documents = new Document();
        $document = $documents->findWithOwner($this->routeId($request));

        if ($document === null) {
            return Response::error('Document introuvable.', 404);
        }

        $documents->delete((string) $document['id']);
        DocumentStore::delete((string) $document['stored_name']);

        if ($documents->forItem((string) $document['checklist_item_id']) === []) {
            (new ChecklistItem())->update((string) $document['checklist_item_id'], ['status' => 'missing', 'rejection_reason' => null]);
        }

        return $this->respond((string) $document['dossier_id'], 'Document supprimé.');
    }

    /** @return array<string, mixed>|null */
    private function dossier(string $id): ?array
    {
        return (new Dossier())->find($id);
    }

    private function respond(string $dossierId, string $message): Response
    {
        $dossiers = new Dossier();
        $dossiers->touch($dossierId);

        return Response::success(DossierView::forAdmin($dossiers->findWithSummary($dossierId)), $message);
    }

    private function flag(mixed $value): int
    {
        return in_array($value, [true, 1, '1', 'true'], true) ? 1 : 0;
    }
}
