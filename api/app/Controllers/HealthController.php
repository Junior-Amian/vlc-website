<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use Throwable;

/**
 * Vérification de l'état du service, utile après chaque déploiement.
 */
final class HealthController extends Controller
{
    public function index(Request $request): Response
    {
        $database = 'inconnu';

        try {
            Database::connection()->query('SELECT 1');
            $database = 'connectée';
        } catch (Throwable) {
            $database = 'indisponible';
        }

        return Response::success([
            'service'  => 'API VISILION CORPORATE',
            'php'      => PHP_VERSION,
            'database' => $database,
            'time'     => date('c'),
        ]);
    }
}
