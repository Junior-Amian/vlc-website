<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\ValidationException;
use App\Dossiers\ClientAccess;
use App\Dossiers\DocumentStore;
use App\Dossiers\DossierView;
use App\Dossiers\Notifier;
use App\Dossiers\Process;
use App\Models\ChecklistItem;
use App\Models\Client;
use App\Models\ContactRequest;
use App\Models\ContentSection;
use App\Models\Dossier;
use Throwable;

/**
 * Dossiers de l'espace client, côté panel : ouverture (qui crée le compte du
 * client et l'invite), suivi, avancement, suppression.
 */
final class DossierController extends Controller
{
    private const LABELS = [
        'full_name'    => 'nom et prénom',
        'email'        => 'adresse email',
        'phone'        => 'téléphone',
        'service'      => 'prestation',
        'country'      => 'pays de destination',
        'amount_total' => 'montant total',
        'step'         => 'étape',
        'note'         => 'note',
    ];

    public function index(Request $request): Response
    {
        $filter = (string) $request->input('filter', 'open');
        $filter = in_array($filter, Dossier::FILTERS, true) ? $filter : 'open';
        $query = mb_substr(trim((string) $request->input('q', '')), 0, 100);
        $step = (int) $request->input('step', 0);
        $step = Process::exists($step) ? $step : null;

        $dossiers = new Dossier();
        $services = DossierView::services();

        return Response::success([
            'items'    => array_map(
                static fn (array $row): array => DossierView::summary($row, $services),
                $dossiers->search($filter, $query, $step)
            ),
            // Vue d'ensemble de tous les dossiers, quel que soit le filtre.
            'overview' => $dossiers->overview(),
            'steps'    => Process::steps(),
        ]);
    }

    /** Dossiers qui demandent l'attention de l'équipe : le badge du menu. */
    public function alerts(Request $request): Response
    {
        return Response::success(['attention' => (new Dossier())->attentionCount()]);
    }

    /** Listes de choix du formulaire d'ouverture et de la fiche. */
    public function options(Request $request): Response
    {
        return Response::success([
            'services' => (new ContentSection())->serviceOptions(),
            'steps'    => Process::steps(),
        ]);
    }

    public function store(Request $request): Response
    {
        $data = $this->validate($request, [
            'full_name'          => 'required|string|min:2|max:120',
            'email'              => 'required|email|max:180',
            'phone'              => 'string|max:30|regex:/^\+?[0-9 ().-]+$/',
            'service'            => 'required|string|max:60',
            'country'            => 'string|max:80',
            'amount_total'       => 'integer|min:0|max:100000000',
            'contact_request_id' => 'uuid',
        ], self::LABELS);

        $this->assertService((string) $data['service']);

        $email = mb_strtolower((string) $data['email']);
        $clients = new Client();

        if ($clients->findByEmail($email) !== null) {
            throw new ValidationException(['email' => ['Un client a déjà un espace avec cette adresse. Retrouvez son dossier dans la liste.']]);
        }

        $requestId = $data['contact_request_id'] !== null ? (string) $data['contact_request_id'] : null;
        $contactRequests = new ContactRequest();

        if ($requestId !== null && $contactRequests->find($requestId) === null) {
            $requestId = null;
        }

        $admin = $request->attribute('admin');
        $db = Database::connection();
        $db->beginTransaction();

        try {
            $clientId = $clients->create([
                'email'     => $email,
                'full_name' => $data['full_name'],
                'phone'     => (string) ($data['phone'] ?? ''),
            ]);

            $dossierId = (new Dossier())->create([
                'client_id'          => $clientId,
                'service'            => $data['service'],
                'country'            => (string) ($data['country'] ?? ''),
                'step'               => Process::FIRST_STEP,
                'amount_total'       => $data['amount_total'] !== null ? (int) $data['amount_total'] : null,
                'contact_request_id' => $requestId,
                'created_by'         => (string) $admin['id'],
            ]);

            $items = new ChecklistItem();

            foreach (Process::DEFAULT_CHECKLIST as $position => $item) {
                $items->create([
                    'dossier_id' => $dossierId,
                    'label'      => $item['label'],
                    'help'       => $item['help'],
                    'required'   => $item['required'] ? 1 : 0,
                    'position'   => $position,
                ]);
            }

            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();

            throw $e;
        }

        // La demande de contact d'origine est traitée : elle a donné un dossier.
        if ($requestId !== null) {
            $contactRequests->update($requestId, ['status' => 'done', 'handled_by' => (string) $admin['id']]);
        }

        $invitation = ClientAccess::invite($clients->find($clientId));

        return Response::success([
            'dossier'    => DossierView::forAdmin((new Dossier())->findWithSummary($dossierId)),
            'invitation' => $invitation,
        ], 'Dossier ouvert.', 201);
    }

    public function show(Request $request): Response
    {
        $dossier = $this->find($request);

        return $dossier instanceof Response ? $dossier : Response::success(DossierView::forAdmin($dossier));
    }

    public function update(Request $request): Response
    {
        $dossier = $this->find($request);

        if ($dossier instanceof Response) {
            return $dossier;
        }

        $data = $this->validate($request, [
            'full_name'    => 'string|min:2|max:120',
            'email'        => 'email|max:180',
            'phone'        => 'string|max:30|regex:/^\+?[0-9 ().-]+$/',
            'service'      => 'string|max:60',
            'country'      => 'string|max:80',
            'amount_total' => 'integer|min:0|max:100000000',
            'step'         => 'integer',
            'note'         => 'string|max:5000',
        ], self::LABELS);

        // Seuls les champs envoyés changent : un champ absent n'est pas un
        // champ vidé (le validateur rend null dans les deux cas).
        $sent = static fn (string $key): bool => array_key_exists($key, $request->body);
        $changes = [];

        if ($sent('step')) {
            $step = (int) $data['step'];

            if (!Process::exists($step)) {
                throw new ValidationException(['step' => ['Étape inconnue.']]);
            }

            if ($step !== (int) $dossier['step']) {
                $changes += ['step' => $step, 'step_changed_at' => date('Y-m-d H:i:s')];
            }
        }

        if ($sent('service')) {
            $this->assertService((string) $data['service']);
            $changes['service'] = $data['service'];
        }

        foreach (['country', 'note'] as $key) {
            if ($sent($key)) {
                $changes[$key] = (string) ($data[$key] ?? '');
            }
        }

        if ($sent('amount_total')) {
            $changes['amount_total'] = $data['amount_total'] !== null ? (int) $data['amount_total'] : null;
        }

        // Tout est validé avant la première écriture.
        $clientChanges = $this->clientChanges($request, $data, (string) $dossier['client_id']);

        if ($changes !== []) {
            (new Dossier())->update((string) $dossier['id'], $changes);
        }

        if ($clientChanges !== []) {
            (new Client())->update((string) $dossier['client_id'], $clientChanges);
        }

        $updated = (new Dossier())->findWithSummary((string) $dossier['id']);
        $advanced = isset($changes['step']) && $changes['step'] > (int) $dossier['step'];

        // Étape franchie : le client est prévenu par email (pas pour un
        // retour en arrière, qui corrige une erreur de l'équipe).
        $client = $advanced ? (new Client())->find((string) $dossier['client_id']) : null;

        if ($client !== null) {
            Notifier::stepAdvanced($updated, $client, (int) $changes['step']);
        }

        return Response::success(
            DossierView::forAdmin($updated),
            $advanced ? 'Étape enregistrée : le client est prévenu par email.' : 'Dossier mis à jour.'
        );
    }

    public function destroy(Request $request): Response
    {
        $dossier = $this->find($request);

        if ($dossier instanceof Response) {
            return $dossier;
        }

        // Le compte client part avec son dossier (un dossier par client pour
        // l'instant) ; pièces, documents et versements suivent en cascade.
        (new Client())->delete((string) $dossier['client_id']);
        DocumentStore::deleteDossier((string) $dossier['id']);

        return Response::success(null, 'Dossier supprimé.');
    }

    /** Nouveau lien d'invitation, pour un client qui n'a pas encore activé son espace. */
    public function invite(Request $request): Response
    {
        $dossier = $this->find($request);

        if ($dossier instanceof Response) {
            return $dossier;
        }

        $client = (new Client())->find((string) $dossier['client_id']);

        if ($client === null || Client::isActive($client)) {
            return Response::error('Ce client a déjà activé son espace. S\'il a oublié son mot de passe, il peut le changer depuis la page de connexion.', 409);
        }

        return Response::success(ClientAccess::invite($client), 'Nouvelle invitation envoyée.');
    }

    /**
     * Corrections du nom, de l'email ou du téléphone du client.
     *
     * @param array<string, mixed> $data
     * @return array<string, string>
     * @throws ValidationException
     */
    private function clientChanges(Request $request, array $data, string $clientId): array
    {
        $changes = [];
        $errors = [];

        if (array_key_exists('phone', $request->body)) {
            $changes['phone'] = (string) ($data['phone'] ?? '');
        }

        if (array_key_exists('full_name', $request->body)) {
            $changes['full_name'] = (string) ($data['full_name'] ?? '');

            if ($changes['full_name'] === '') {
                $errors['full_name'] = ['Le champ nom et prénom est obligatoire.'];
            }
        }

        if (array_key_exists('email', $request->body)) {
            $changes['email'] = mb_strtolower((string) ($data['email'] ?? ''));
            $owner = $changes['email'] !== '' ? (new Client())->findByEmail($changes['email']) : null;

            if ($changes['email'] === '') {
                $errors['email'] = ['Le champ adresse email est obligatoire.'];
            } elseif ($owner !== null && (string) $owner['id'] !== $clientId) {
                $errors['email'] = ['Cette adresse est déjà celle d\'un autre client.'];
            }
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return $changes;
    }

    private function assertService(string $slug): void
    {
        if (!array_key_exists($slug, DossierView::services())) {
            throw new ValidationException(['service' => ['Choisissez une prestation dans la liste.']]);
        }
    }

    /** @return array<string, mixed>|Response */
    private function find(Request $request): array|Response
    {
        $dossier = (new Dossier())->findWithSummary($this->routeId($request));

        return $dossier ?? Response::error('Dossier introuvable.', 404);
    }
}
