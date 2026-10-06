<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\ValidationException;
use App\Dossiers\DossierView;
use App\Models\Dossier;
use App\Models\DossierPayment;

/**
 * Versements reçus pour un dossier. Le client les voit dans son espace, avec
 * le total et le solde restant.
 */
final class PaymentController extends Controller
{
    public function store(Request $request): Response
    {
        $dossiers = new Dossier();
        $dossier = $dossiers->find($this->routeId($request));

        if ($dossier === null) {
            return Response::error('Dossier introuvable.', 404);
        }

        $data = $this->validate($request, [
            'amount'  => 'required|integer|min:1|max:100000000',
            'paid_on' => 'required|regex:/^\d{4}-\d{2}-\d{2}$/',
            'label'   => 'string|max:120',
        ], ['amount' => 'montant', 'paid_on' => 'date du versement', 'label' => 'libellé']);

        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', (string) $data['paid_on']);

        if ($date === false || $date->format('Y-m-d') !== $data['paid_on'] || $date > new \DateTimeImmutable('tomorrow')) {
            throw new ValidationException(['paid_on' => ['Date invalide ou à venir.']]);
        }

        (new DossierPayment())->create([
            'dossier_id'  => (string) $dossier['id'],
            'amount'      => (int) $data['amount'],
            'paid_on'     => $data['paid_on'],
            'label'       => (string) ($data['label'] ?? ''),
            'recorded_by' => (string) $request->attribute('admin')['id'],
        ]);

        return $this->respond((string) $dossier['id'], 'Versement enregistré.');
    }

    public function destroy(Request $request): Response
    {
        $payments = new DossierPayment();
        $payment = $payments->find($this->routeId($request));

        if ($payment === null) {
            return Response::error('Versement introuvable.', 404);
        }

        $payments->delete((string) $payment['id']);

        return $this->respond((string) $payment['dossier_id'], 'Versement supprimé.');
    }

    private function respond(string $dossierId, string $message): Response
    {
        $dossiers = new Dossier();
        $dossiers->touch($dossierId);

        return Response::success(DossierView::forAdmin($dossiers->findWithSummary($dossierId)), $message);
    }
}
