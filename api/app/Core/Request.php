<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Représentation immuable de la requête HTTP entrante.
 */
final class Request
{
    /** @param array<string, mixed> $body */
    private function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public readonly array $headers,
        public readonly array $files,
        public readonly string $ip,
    ) {
    }

    /** @var array<string, string> */
    private array $routeParams = [];

    public static function capture(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        // Certains clients ne savent émettre que GET/POST : on accepte la
        // surcharge de méthode, mais uniquement depuis un POST.
        if ($method === 'POST') {
            $override = strtoupper((string) ($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? ''));
            if (in_array($override, ['PUT', 'PATCH', 'DELETE'], true)) {
                $method = $override;
            }
        }

        $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $path = '/' . trim((string) $path, '/');

        // En sous-dossier (cas classique du mutualisé : /api/public), on
        // retire le préfixe du script pour retrouver la route applicative.
        $base = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? ''))), '/');
        if ($base !== '' && $base !== '/' && str_starts_with($path, $base)) {
            $path = '/' . ltrim(substr($path, strlen($base)), '/');
        }

        return new self(
            method:  $method,
            path:    $path === '' ? '/' : $path,
            query:   $_GET,
            body:    self::parseBody(),
            headers: self::parseHeaders(),
            files:   $_FILES,
            ip:      self::clientIp(),
        );
    }

    /** @return array<string, mixed> */
    private static function parseBody(): array
    {
        $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));

        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input') ?: '';

            if ($raw === '') {
                return [];
            }

            $decoded = json_decode($raw, true);

            return is_array($decoded) ? $decoded : [];
        }

        return $_POST;
    }

    /** @return array<string, string> */
    private static function parseHeaders(): array
    {
        $headers = [];

        foreach ($_SERVER as $key => $value) {
            if (str_starts_with((string) $key, 'HTTP_')) {
                $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr((string) $key, 5)))));
                $headers[$name] = (string) $value;
            }
        }

        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['Content-Type'] = (string) $_SERVER['CONTENT_TYPE'];
        }

        return $headers;
    }

    private static function clientIp(): string
    {
        // On ne fait confiance qu'à REMOTE_ADDR : les en-têtes X-Forwarded-*
        // sont falsifiables par le client et serviraient à contourner la
        // limitation de débit.
        return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }

    public function header(string $name, ?string $default = null): ?string
    {
        foreach ($this->headers as $key => $value) {
            if (strcasecmp($key, $name) === 0) {
                return $value;
            }
        }

        return $default;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $this->query[$key] ?? $default;
    }

    public function bearerToken(): ?string
    {
        $authorization = $this->header('Authorization');

        if ($authorization !== null && preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches) === 1) {
            return trim($matches[1]);
        }

        return null;
    }

    /** @param array<string, string> $params */
    public function setRouteParams(array $params): void
    {
        $this->routeParams = $params;
    }

    public function param(string $key, ?string $default = null): ?string
    {
        return $this->routeParams[$key] ?? $default;
    }
}
