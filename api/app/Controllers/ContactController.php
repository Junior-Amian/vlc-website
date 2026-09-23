<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Logger;
use App\Core\Mailer;
use App\Core\Request;
use App\Core\Response;

/**
 * Formulaire de contact du site vitrine.
 *
 * Aucune base de données : la demande est envoyée par email à l'équipe
 * (MAIL_ADMIN_ADDRESS), avec l'adresse du visiteur en Reply-To pour qu'une
 * simple réponse lui parvienne.
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

    public function store(Request $request): Response
    {
        $data = $this->validate($request, self::RULES, self::LABELS);

        $config = require BASE_PATH . '/config/app.php';

        $html = Mailer::layout(
            'Nouvelle demande de contact',
            'Une demande vient d\'être envoyée depuis le formulaire du site. Répondez directement à cet email pour écrire au visiteur.',
            [
                'Nom et prénom' => $data['full_name'],
                'Email'         => $data['email'],
                'Téléphone'     => $data['phone'],
                'Message'       => $data['message'],
                'Reçue le'      => date('d/m/Y à H:i'),
            ]
        );

        $sent = Mailer::send(
            (string) $config['mail']['admin_address'],
            'Nouvelle demande de contact : ' . $data['full_name'],
            $html,
            $data['email']
        );

        if (!$sent) {
            // Sans base de données, le journal est la seule trace de la
            // demande : on la consigne pour pouvoir rappeler le visiteur.
            Logger::error('Demande de contact non transmise par email', [
                'full_name' => $data['full_name'],
                'email'     => $data['email'],
                'phone'     => $data['phone'],
                'message'   => $data['message'],
            ]);

            return Response::error(
                'Votre message n\'a pas pu être envoyé pour le moment. Appelez-nous ou écrivez-nous sur WhatsApp au '
                    . $config['company']['phone'] . '.',
                503
            );
        }

        return Response::success(null, 'Votre message a bien été envoyé.');
    }
}
