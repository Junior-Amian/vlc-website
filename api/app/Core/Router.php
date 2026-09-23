<?php

declare(strict_types=1);

namespace App\Core;

use RuntimeException;
use Throwable;

/**
 * Routeur HTTP avec paramètres nommés et pile de middlewares.
 *
 * Les routes sont déclarées dans routes/api.php sous la forme
 * $router->post('/contact', [ContactController::class, 'store'])
 */
final class Router
{
    /** @var array<int, array{method: string, regex: string, params: string[], handler: mixed, middleware: string[]}> */
    private array $routes = [];

    /** @var string[] */
    private array $globalMiddleware = [];

    /** @var string[] */
    private array $groupMiddleware = [];

    private string $groupPrefix = '';

    /** @param string[] $middleware */
    public function middleware(array $middleware): void
    {
        $this->globalMiddleware = $middleware;
    }

    /**
     * Regroupe des routes sous un préfixe et/ou une pile de middlewares.
     *
     * @param string[] $middleware
     */
    public function group(string $prefix, callable $callback, array $middleware = []): void
    {
        $previousPrefix = $this->groupPrefix;
        $previousMiddleware = $this->groupMiddleware;

        $this->groupPrefix .= '/' . trim($prefix, '/');
        $this->groupMiddleware = [...$this->groupMiddleware, ...$middleware];

        $callback($this);

        $this->groupPrefix = $previousPrefix;
        $this->groupMiddleware = $previousMiddleware;
    }

    /** @param string[] $middleware */
    public function get(string $path, mixed $handler, array $middleware = []): void
    {
        $this->add('GET', $path, $handler, $middleware);
    }

    /** @param string[] $middleware */
    public function post(string $path, mixed $handler, array $middleware = []): void
    {
        $this->add('POST', $path, $handler, $middleware);
    }

    /** @param string[] $middleware */
    public function put(string $path, mixed $handler, array $middleware = []): void
    {
        $this->add('PUT', $path, $handler, $middleware);
    }

    /** @param string[] $middleware */
    public function patch(string $path, mixed $handler, array $middleware = []): void
    {
        $this->add('PATCH', $path, $handler, $middleware);
    }

    /** @param string[] $middleware */
    public function delete(string $path, mixed $handler, array $middleware = []): void
    {
        $this->add('DELETE', $path, $handler, $middleware);
    }

    /** @param string[] $middleware */
    private function add(string $method, string $path, mixed $handler, array $middleware): void
    {
        $full = $this->groupPrefix . '/' . trim($path, '/');
        $full = '/' . trim($full, '/');
        $full = $full === '' ? '/' : $full;

        $params = [];

        // « /dossiers/{id}/documents » devient une expression régulière dont
        // chaque {nom} capture un segment.
        $regex = preg_replace_callback(
            '/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/',
            static function (array $matches) use (&$params): string {
                $params[] = $matches[1];

                return '([^/]+)';
            },
            $full
        );

        $this->routes[] = [
            'method'     => $method,
            'regex'      => '#^' . $regex . '$#',
            'params'     => $params,
            'handler'    => $handler,
            'middleware' => [...$this->groupMiddleware, ...$middleware],
        ];
    }

    public function dispatch(Request $request): Response
    {
        $allowedMethods = [];

        foreach ($this->routes as $route) {
            if (preg_match($route['regex'], $request->path, $matches) !== 1) {
                continue;
            }

            if ($route['method'] !== $request->method) {
                $allowedMethods[] = $route['method'];
                continue;
            }

            array_shift($matches);
            $request->setRouteParams(array_combine($route['params'], $matches) ?: []);

            return $this->runPipeline($request, $route);
        }

        // Une route existe mais pas pour ce verbe : 405 est plus parlant
        // qu'un 404 et permet au client de corriger sa requête.
        if ($allowedMethods !== []) {
            return Response::error('Méthode non autorisée pour cette ressource.', 405)
                ->withHeader('Allow', implode(', ', array_unique($allowedMethods)));
        }

        return Response::error('Ressource introuvable.', 404);
    }

    /** @param array{handler: mixed, middleware: string[]} $route */
    private function runPipeline(Request $request, array $route): Response
    {
        $middlewareStack = [...$this->globalMiddleware, ...$route['middleware']];

        // On construit la pile à l'envers : chaque middleware reçoit le
        // maillon suivant sous forme de closure.
        $next = fn (Request $req): Response => $this->callHandler($route['handler'], $req);

        foreach (array_reverse($middlewareStack) as $middlewareClass) {
            $currentNext = $next;

            $next = static function (Request $req) use ($middlewareClass, $currentNext): Response {
                /** @var Middleware $instance */
                $instance = new $middlewareClass();

                return $instance->handle($req, $currentNext);
            };
        }

        return $next($request);
    }

    private function callHandler(mixed $handler, Request $request): Response
    {
        if (is_callable($handler)) {
            $result = $handler($request);
        } elseif (is_array($handler) && count($handler) === 2) {
            [$class, $method] = $handler;

            if (!class_exists($class)) {
                throw new RuntimeException("Contrôleur introuvable : {$class}");
            }

            $controller = new $class();

            if (!method_exists($controller, $method)) {
                throw new RuntimeException("Action introuvable : {$class}::{$method}");
            }

            $result = $controller->{$method}($request);
        } else {
            throw new RuntimeException('Gestionnaire de route invalide.');
        }

        if (!$result instanceof Response) {
            throw new RuntimeException('Un contrôleur doit retourner une instance de Response.');
        }

        return $result;
    }
}
