<?php

declare(strict_types=1);

/*
 * Routes de l'API. Les chemins sont relatifs à la racine de l'API : en
 * production, « /api/contact » arrive ici sous la forme « /contact »
 * (Request::capture retire le dossier du script).
 *
 * @var App\Core\Router $router
 */

use App\Controllers\ContactController;
use App\Controllers\HealthController;
use App\Middleware\RateLimitMiddleware;

$router->get('/health', [HealthController::class, 'index']);

// Limité à 5 envois par IP toutes les 10 minutes (RateLimitMiddleware).
$router->post('/contact', [ContactController::class, 'store'], [RateLimitMiddleware::class]);
