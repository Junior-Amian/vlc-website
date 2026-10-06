<?php

declare(strict_types=1);

use App\Core\Env;

return [
    'name'     => Env::get('APP_NAME', 'VISILION CORPORATE'),
    'env'      => Env::get('APP_ENV', 'production'),
    'debug'    => Env::bool('APP_DEBUG', false),
    'url'      => Env::get('APP_URL', 'https://visilioncorporate.com'),
    'timezone' => 'Africa/Abidjan',

    'mail' => [
        // « mail » : envoi réel par mail(). « log » : écrit l'email dans
        // storage/logs, pour le développement local sans serveur SMTP.
        'transport'    => Env::get('MAIL_TRANSPORT', 'mail'),
        'from_address' => Env::get('MAIL_FROM_ADDRESS', 'contact@visilioncorporate.com'),
        'from_name'    => Env::get('MAIL_FROM_NAME', 'VISILION CORPORATE'),
        // Adresse qui reçoit les demandes du formulaire de contact.
        'admin_address' => Env::get('MAIL_ADMIN_ADDRESS', 'infovisilioncorporate@gmail.com'),
        // Adresse de l'équipe pour l'espace client : réponse aux emails
        // d'invitation et de mot de passe. PROVISOIRE (adresse fictive) : le
        // client la donnera une fois l'hébergement pris.
        'dossiers_address' => Env::get('MAIL_DOSSIERS_ADDRESS', 'dossiers@visilioncorporate.com'),
    ],

    // Les coordonnées de l'entreprise ne vivent pas ici : elles se modifient
    // dans le panel (section « Coordonnées », table content_sections).
];
