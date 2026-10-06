<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\ValidationException;
use App\Models\ContactRequest;

/**
 * Traitement des demandes de contact dans le panel.
 */
final class ContactRequestController extends Controller
{
    private const PER_PAGE = 30;

    /** GET /admin/requests?filter=open|done|spam|all&q=&page= */
    public function index(Request $request): Response
    {
        $filter = (string) $request->input('filter', 'open');
        $filter = array_key_exists($filter, ContactRequest::FILTERS) ? $filter : 'open';
        $query = mb_substr(trim((string) $request->input('q', '')), 0, 100);
        $page = max(1, (int) $request->input('page', 1));

        $requests = new ContactRequest();
        $result = $requests->search($filter, $query, $page, self::PER_PAGE);

        return Response::success([
            'items'   => array_map([ContactRequest::class, 'present'], $result['items']),
            'total'   => $result['total'],
            'page'    => $page,
            'perPage' => self::PER_PAGE,
            'counts'  => $requests->counts(),
        ]);
    }

    /** Nombre de demandes par état : le badge du menu. */
    public function summary(Request $request): Response
    {
        return Response::success((new ContactRequest())->counts());
    }

    /**
     * Une demande. Ouverte alors qu'elle était « nouvelle », elle passe « en
     * cours » au nom de l'administrateur qui l'ouvre : le badge du menu ne
     * compte ainsi que les demandes que personne n'a encore lues.
     */
    public function show(Request $request): Response
    {
        $requests = new ContactRequest();
        $row = $this->find($requests, $request);

        if ($row instanceof Response) {
            return $row;
        }

        if ($row['status'] === 'new') {
            $requests->update((string) $row['id'], [
                'status'     => 'in_progress',
                'handled_by' => (string) $request->attribute('admin')['id'],
            ]);
            $row = $requests->findWithHandler((string) $row['id']);
        }

        return Response::success(ContactRequest::present($row));
    }

    /** PATCH : état et/ou note interne. */
    public function update(Request $request): Response
    {
        $requests = new ContactRequest();
        $row = $this->find($requests, $request);

        if ($row instanceof Response) {
            return $row;
        }

        $changes = [];
        $status = $request->input('status');
        $note = $request->input('note');

        if ($status !== null) {
            if (!in_array($status, ContactRequest::STATUSES, true)) {
                throw new ValidationException(['status' => ['État inconnu.']]);
            }

            $changes['status'] = $status;
        }

        if ($note !== null) {
            $note = trim(is_string($note) ? $note : '');

            if (mb_strlen($note) > 5000) {
                throw new ValidationException(['note' => ['5000 caractères au maximum.']]);
            }

            $changes['note'] = $note === '' ? null : $note;
        }

        if ($changes === []) {
            throw new ValidationException(['status' => ['Rien à modifier.']]);
        }

        $requests->update((string) $row['id'], [...$changes, 'handled_by' => (string) $request->attribute('admin')['id']]);

        return Response::success(ContactRequest::present($requests->findWithHandler((string) $row['id'])), 'Demande mise à jour.');
    }

    public function destroy(Request $request): Response
    {
        $requests = new ContactRequest();
        $row = $this->find($requests, $request);

        if ($row instanceof Response) {
            return $row;
        }

        $requests->delete((string) $row['id']);

        return Response::success(null, 'Demande supprimée.');
    }

    /** @return array<string, mixed>|Response */
    private function find(ContactRequest $requests, Request $request): array|Response
    {
        $row = $requests->findWithHandler($this->routeId($request));

        return $row ?? Response::error('Demande introuvable : elle a peut-être été supprimée.', 404);
    }
}
