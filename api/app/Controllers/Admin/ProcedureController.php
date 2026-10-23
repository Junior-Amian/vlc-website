<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Content\ContentValidator;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Dossiers\DossierView;
use App\Dossiers\Process;
use App\Dossiers\ProcedureSchema;
use App\Models\ContentSection;
use App\Models\Procedure;

/**
 * Procédures du panel : les étapes et les pièces que l'équipe n'a plus à
 * ressaisir à chaque ouverture de dossier.
 *
 * Modifier ou supprimer une procédure ne touche pas les dossiers déjà
 * ouverts : ils en ont reçu une copie.
 */
final class ProcedureController extends Controller
{
    /** Toutes les procédures, et de quoi construire le formulaire. */
    public function index(Request $request): Response
    {
        $services = DossierView::services();

        return Response::success([
            'items'    => array_map(
                static fn (array $row): array => Procedure::present($row, $services),
                (new Procedure())->allSorted()
            ),
            'fields'   => ProcedureSchema::fields(),
            'options'  => ['services' => (new ContentSection())->serviceOptions()],
            // Proposition de départ d'une nouvelle procédure.
            'defaults' => [
                'steps' => array_map(
                    static fn (array $step): array => ['label' => $step['label'], 'description' => $step['description']],
                    Process::DEFAULT_STEPS
                ),
            ],
        ]);
    }

    public function store(Request $request): Response
    {
        $procedures = new Procedure();
        $id = $procedures->create($this->clean($request));

        return Response::success(
            Procedure::present($procedures->find($id), DossierView::services()),
            'Procédure créée.',
            201
        );
    }

    public function update(Request $request): Response
    {
        $procedures = new Procedure();
        $id = $this->routeId($request);

        if ($id === '' || $procedures->find($id) === null) {
            return Response::error('Procédure introuvable.', 404);
        }

        $procedures->update($id, $this->clean($request));

        return Response::success(
            Procedure::present($procedures->find($id), DossierView::services()),
            'Procédure enregistrée. Elle s\'applique aux prochains dossiers ouverts.'
        );
    }

    public function destroy(Request $request): Response
    {
        $procedures = new Procedure();
        $id = $this->routeId($request);

        if ($id === '' || $procedures->find($id) === null) {
            return Response::error('Procédure introuvable.', 404);
        }

        $procedures->delete($id);

        return Response::success(null, 'Procédure supprimée. Les dossiers déjà ouverts la gardent.');
    }

    /**
     * Valide la procédure envoyée ; seuls les champs du schéma passent.
     *
     * @return array{service: string, name: string, steps: string, checklist: string}
     */
    private function clean(Request $request): array
    {
        $validator = new ContentValidator(
            optionsFrom: static fn (string $source): array => $source === 'services'
                ? array_keys(DossierView::services())
                : [],
            mediaExists: static fn (string $id): bool => false,
        );

        $data = $validator->validate(['fields' => ProcedureSchema::fields()], $request->input('data'));
        $json = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR;

        return [
            'service'   => $data['service'],
            'name'      => $data['name'],
            'steps'     => json_encode($data['steps'], $json),
            'checklist' => json_encode($data['checklist'], $json),
        ];
    }
}
