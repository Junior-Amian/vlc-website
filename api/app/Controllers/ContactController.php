<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Logger;
use App\Core\Mailer;
use App\Core\Request;
use App\Core\Response;
use App\Models\ContactRequest;
use Throwable;

/**
 * Formulaire de contact du site vitrine.
 *
 * La demande est enregistrée en base (table contact_requests, traitée dans
 * le panel), puis signalée par email à l'équipe (MAIL_ADMIN_ADDRESS), avec
 * l'adresse du visiteur en Reply-To pour qu'une simple réponse lui parvienne.
 * L'un des deux suffit : la demande n'est perdue que si la base ET l'email
 * échouent ensemble.
 *
 * Contrat attendu par le front (frontend/src/lib/api.ts) :
 * - succès : 200 { success: true, message }
 * - erreurs de saisie : 422 { success: false, message, errors: { champ: [motif] } },
 *   les clés d'errors correspondant aux noms des champs du formulaire.
 */
final class ContactController extends Controller
{
    private const RULES = [
        'full_name' => 'required|string|min:2|max:120',
        'email'     => 'required|email|max:180',
        'phone'     => 'required|string|min:8|max:30|regex:/^\+?[0-9 ().-]+$/',
        'message'   => 'required|string|min:10|max:3000',
        'consent'   => 'accepted',
    ];

    private const LABELS = [
        'full_name' => 'nom et prénom',
        'email'     => 'adresse email',
        'phone'     => 'téléphone',
        'message'   => 'message',
        'consent'   => 'consentement',
    ];

    /**
     * Champ piège, invisible pour un humain (ContactForm.tsx) : les robots
     * qui remplissent tout le formulaire le remplissent aussi.
     */
    private const HONEYPOT = 'website';

    public function store(Request $request): Response
    {
        $data = $this->validate($request, self::RULES, self::LABELS);
        $isSpam = trim((string) $request->input(self::HONEYPOT, '')) !== '';

        $requests = new ContactRequest();
        $id = null;

        try {
            $id = $requests->create([
                'full_name' => $data['full_name'],
                'email'     => mb_strtolower((string) $data['email']),
                'phone'     => $data['phone'],
                'message'   => $data['message'],
                'status'    => $isSpam ? 'spam' : 'new',
            ]);
        } catch (Throwable $e) {
            Logger::error('Demande de contact non enregistrée en base', ['message' => $e->getMessage()]);
        }

        // Le robot reçoit la même réponse qu'un visiteur : rien ne lui
        // indique qu'il a été repéré.
        if ($isSpam) {
            return Response::success(null, 'Votre message a bien été envoyé.');
        }

        $sent = $this->notify($data, $id);

        if ($id !== null && $sent) {
            $requests->update($id, ['email_sent' => 1]);
        }

        if ($id === null && !$sent) {
            // Ni base ni email : le journal est la seule trace de la demande,
            // on la consigne pour pouvoir rappeler le visiteur.
            Logger::error('Demande de contact ni enregistrée ni transmise', [
                'full_name' => $data['full_name'],
                'email'     => $data['email'],
                'phone'     => $data['phone'],
                'message'   => $data['message'],
            ]);

            // Pas de numéro dans ce message : le formulaire propose aussitôt
            // d'envoyer le même texte par WhatsApp, au numéro à jour du site.
            return Response::error(
                'Votre message n\'a pas pu être envoyé pour le moment. Appelez-nous ou écrivez-nous sur WhatsApp.',
                503
            );
        }

        return Response::success(null, 'Votre message a bien été envoyé.');
    }

    /** @param array<string, mixed> $data */
    private function notify(array $data, ?string $id): bool
    {
        $config = require BASE_PATH . '/config/app.php';

        $rows = [
            'Nom et prénom' => $data['full_name'],
            'Email'         => $data['email'],
            'Téléphone'     => $data['phone'],
            'Message'       => $data['message'],
            'Reçue le'      => date('d/m/Y à H:i'),
        ];

        if ($id !== null) {
            $rows['Dans le panel'] = rtrim((string) $config['url'], '/') . '/admin/demandes/' . $id;
        }

        $html = Mailer::layout(
            'Nouvelle demande de contact',
            'Une demande vient d\'être envoyée depuis le formulaire du site. Répondez directement à cet email pour écrire au visiteur.',
            $rows
        );

        return Mailer::send(
            (string) $config['mail']['admin_address'],
            'Nouvelle demande de contact : ' . $data['full_name'],
            $html,
            (string) $data['email']
        );
    }
}
