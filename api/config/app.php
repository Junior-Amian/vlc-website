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
    ],

    'company' => [
        'phone'    => '+225 01 51 46 30 51',
        'whatsapp' => '2250151463051',
        'email'    => 'contact@visilioncorporate.com',
        'city'     => 'Abidjan, Côte d\'Ivoire',
        'slogan'   => 'Notre vision, votre satisfaction',
    ],
];
