<?php

declare(strict_types=1);

/*
 * Contrôleur frontal de l'API : toutes les requêtes y sont réécrites par
 * public/.htaccess. Seul ce dossier est exposé par le serveur web.
 */

use App\Core\Autoloader;
use App\Core\Env;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Core\ValidationException;
use App\Middleware\CorsMiddleware;

define('BASE_PATH', dirname(__DIR__));

require BASE_PATH . '/app/Core/Autoloader.php';
Autoloader::register();

Env::load(BASE_PATH . '/.env');

$config = require BASE_PATH . '/config/app.php';

date_default_timezone_set($config['timezone']);

// Les erreurs PHP ne doivent jamais s'afficher au milieu d'une réponse JSON :
// elles sont converties en exceptions, puis journalisées par le bloc ci-dessous.
ini_set('display_errors', '0');
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }

    throw new ErrorException($message, 0, $severity, $file, $line);
});

$router = new Router();
$router->middleware([CorsMiddleware::class]);

require BASE_PATH . '/routes/api.php';

try {
    $response = $router->dispatch(Request::capture());
} catch (ValidationException $e) {
    $response = Response::error($e->getMessage(), 422, $e->errors());
} catch (Throwable $e) {
    Logger::error('Erreur non gérée', [
        'exception' => $e::class,
        'message'   => $e->getMessage(),
        'file'      => $e->getFile() . ':' . $e->getLine(),
    ]);

    // Database lève une RuntimeException 503 au message déjà présentable ;
    // pour tout le reste, le détail ne sort qu'en mode debug.
    $status = $e->getCode() === 503 ? 503 : 500;
    $message = match (true) {
        $status === 503 => $e->getMessage(),
        $config['debug'] => $e->getMessage(),
        default          => 'Une erreur interne est survenue. Merci de réessayer plus tard.',
    };

    $response = Response::error($message, $status);
}

$response->send();
