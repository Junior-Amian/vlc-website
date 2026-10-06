<?php

declare(strict_types=1);

/*
 * Routes de l'API. Les chemins sont relatifs à la racine de l'API : en
 * production, « /api/contact » arrive ici sous la forme « /contact »
 * (Request::capture retire le dossier du script).
 *
 * @var App\Core\Router $router
 */

use App\Controllers\Admin\AuthController;
use App\Controllers\Admin\ChecklistController;
use App\Controllers\Admin\ContactRequestController;
use App\Controllers\Admin\DossierController;
use App\Controllers\Admin\MediaController;
use App\Controllers\Admin\MessageController as AdminMessageController;
use App\Controllers\Admin\PaymentController;
use App\Controllers\Admin\SectionController;
use App\Controllers\Admin\StatsController;
use App\Controllers\Client\AuthController as ClientAuthController;
use App\Controllers\Client\DossierController as ClientDossierController;
use App\Controllers\Client\MessageController as ClientMessageController;
use App\Controllers\ContactController;
use App\Controllers\ContentController;
use App\Controllers\HealthController;
use App\Controllers\TrackController;
use App\Core\Router;
use App\Middleware\AdminAuthMiddleware;
use App\Middleware\AuthMiddleware;
use App\Middleware\CsrfMiddleware;
use App\Middleware\MessageRateLimitMiddleware;
use App\Middleware\RateLimitMiddleware;
use App\Middleware\TrackRateLimitMiddleware;

$router->get('/health', [HealthController::class, 'index']);

// Limité à 5 envois par IP toutes les 10 minutes (RateLimitMiddleware).
$router->post('/contact', [ContactController::class, 'store'], [RateLimitMiddleware::class]);

// Contenu modifiable du site, lu à chaque visite.
$router->get('/content', [ContentController::class, 'show']);

// Mesure d'audience, sans cookie (voir TrackController et VisitorId).
$router->post('/track', [TrackController::class, 'store'], [TrackRateLimitMiddleware::class]);

// --- Panel d'administration ------------------------------------------------
$router->group('/admin', static function (Router $router): void {
    // 5 tentatives de connexion par IP toutes les 10 minutes.
    $router->post('/login', [AuthController::class, 'login'], [RateLimitMiddleware::class]);

    $router->group('', static function (Router $router): void {
        $router->post('/logout', [AuthController::class, 'logout']);
        $router->get('/me', [AuthController::class, 'me']);
        $router->put('/me/password', [AuthController::class, 'changePassword']);

        $router->get('/stats', [StatsController::class, 'index']);

        // « summary » avant « {id} » : le premier motif qui correspond l'emporte.
        $router->get('/requests', [ContactRequestController::class, 'index']);
        $router->get('/requests/summary', [ContactRequestController::class, 'summary']);
        $router->get('/requests/{id}', [ContactRequestController::class, 'show']);
        $router->patch('/requests/{id}', [ContactRequestController::class, 'update']);
        $router->delete('/requests/{id}', [ContactRequestController::class, 'destroy']);

        $router->get('/schema', [SectionController::class, 'schema']);
        $router->get('/sections/{key}', [SectionController::class, 'show']);
        $router->put('/sections/{key}', [SectionController::class, 'update']);

        $router->get('/media', [MediaController::class, 'index']);
        $router->post('/media', [MediaController::class, 'store']);
        $router->patch('/media/{id}', [MediaController::class, 'update']);
        $router->delete('/media/{id}', [MediaController::class, 'destroy']);

        // Dossiers de l'espace client. « options » avant « {id} ».
        $router->get('/dossiers', [DossierController::class, 'index']);
        $router->get('/dossiers/options', [DossierController::class, 'options']);
        $router->get('/dossiers/alerts', [DossierController::class, 'alerts']);
        $router->post('/dossiers', [DossierController::class, 'store']);
        $router->get('/dossiers/{id}', [DossierController::class, 'show']);
        $router->patch('/dossiers/{id}', [DossierController::class, 'update']);
        $router->delete('/dossiers/{id}', [DossierController::class, 'destroy']);
        $router->post('/dossiers/{id}/invitation', [DossierController::class, 'invite']);
        $router->get('/dossiers/{id}/messages', [AdminMessageController::class, 'index']);
        $router->post('/dossiers/{id}/messages', [AdminMessageController::class, 'store']);

        $router->post('/dossiers/{id}/items', [ChecklistController::class, 'store']);
        $router->put('/dossiers/{id}/items/order', [ChecklistController::class, 'reorder']);
        $router->patch('/items/{id}', [ChecklistController::class, 'update']);
        $router->delete('/items/{id}', [ChecklistController::class, 'destroy']);
        $router->get('/documents/{id}', [ChecklistController::class, 'download']);
        $router->delete('/documents/{id}', [ChecklistController::class, 'destroyDocument']);

        $router->post('/dossiers/{id}/payments', [PaymentController::class, 'store']);
        $router->delete('/payments/{id}', [PaymentController::class, 'destroy']);
    }, [AdminAuthMiddleware::class]);
}, [CsrfMiddleware::class]);

// --- Espace client -----------------------------------------------------------
$router->group('/client', static function (Router $router): void {
    // Connexion, liens d'accès : 5 essais par IP toutes les 10 minutes.
    $router->post('/login', [ClientAuthController::class, 'login'], [RateLimitMiddleware::class]);
    $router->post('/logout', [ClientAuthController::class, 'logout']);
    $router->post('/password/forgot', [ClientAuthController::class, 'forgotPassword'], [RateLimitMiddleware::class]);
    // Le jeton voyage dans le corps, pas dans l'adresse : il n'apparaît pas
    // dans les journaux du serveur.
    $router->post('/access/check', [ClientAuthController::class, 'checkAccess']);
    $router->post('/access', [ClientAuthController::class, 'setPassword'], [RateLimitMiddleware::class]);

    $router->group('', static function (Router $router): void {
        $router->get('/me', [ClientDossierController::class, 'show']);
        $router->put('/me/profile', [ClientDossierController::class, 'saveProfile']);
        $router->post('/items/{id}/documents', [ClientDossierController::class, 'upload']);
        $router->get('/documents/{id}', [ClientDossierController::class, 'download']);
        $router->delete('/documents/{id}', [ClientDossierController::class, 'destroyDocument']);
        // 20 messages toutes les 10 minutes (MessageRateLimitMiddleware).
        $router->get('/messages', [ClientMessageController::class, 'index']);
        $router->post('/messages', [ClientMessageController::class, 'store'], [MessageRateLimitMiddleware::class]);
    }, [AuthMiddleware::class]);
}, [CsrfMiddleware::class]);
