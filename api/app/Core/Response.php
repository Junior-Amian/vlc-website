<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Réponse HTTP. Toutes les réponses de l'API sont du JSON, sauf les
 * documents de l'espace client (voir file()).
 */
final class Response
{
    /** @var array<int, array{name: string, value: string, options: array<string, mixed>}> */
    private array $cookies = [];

    /** Corps JSON déjà encodé, envoyé à la place de $payload (voir successJson). */
    private ?string $rawBody = null;

    /** Fichier envoyé tel quel à la place d'un corps JSON (voir file). */
    private ?string $filePath = null;

    /** @param array<string, string> $headers */
    public function __construct(
        private mixed $payload = null,
        private int $status = 200,
        private array $headers = [],
    ) {
    }

    public static function json(mixed $payload, int $status = 200): self
    {
        return new self($payload, $status);
    }

    public static function success(mixed $data = null, string $message = '', int $status = 200): self
    {
        $payload = ['success' => true];

        if ($message !== '') {
            $payload['message'] = $message;
        }

        if ($data !== null) {
            $payload['data'] = $data;
        }

        return new self($payload, $status);
    }

    /** @param array<string, string[]> $errors */
    public static function error(string $message, int $status = 400, array $errors = []): self
    {
        $payload = ['success' => false, 'message' => $message];

        if ($errors !== []) {
            $payload['errors'] = $errors;
        }

        return new self($payload, $status);
    }

    public static function noContent(): self
    {
        return new self(null, 204);
    }

    /**
     * Succès dont les données sont déjà encodées en JSON (contenu mis en
     * cache, par exemple) : elles sont insérées telles quelles, sans
     * décodage ni réencodage.
     */
    public static function successJson(string $json): self
    {
        $response = new self(null, 200);
        $response->rawBody = '{"success":true,"data":' . $json . '}';

        return $response;
    }

    /**
     * Un fichier déposé par un client.
     *
     * Ces fichiers sont libres de format et viennent de l'extérieur : seuls
     * les types sûrs (PDF, images courantes) s'affichent dans le navigateur,
     * tout le reste est proposé au téléchargement sous un type neutre, que
     * le navigateur ne peut pas interpréter (nosniff) : une page HTML
     * déguisée ne s'exécute donc jamais sous l'adresse du site. (Pas de
     * politique « sandbox » : Chrome refuse alors d'afficher les PDF.)
     *
     * @param string[] $viewable Types affichables dans le navigateur.
     */
    public static function file(string $path, string $name, string $mime, array $viewable): self
    {
        $inline = in_array($mime, $viewable, true);

        // Nom ASCII de repli, puis nom exact encodé (RFC 6266).
        $fallback = (string) preg_replace('/[^A-Za-z0-9._ -]+/', '_', $name);
        $disposition = sprintf(
            '%s; filename="%s"; filename*=UTF-8\'\'%s',
            $inline ? 'inline' : 'attachment',
            $fallback,
            rawurlencode($name)
        );

        $response = new self(null, 200, [
            'Content-Type'            => $inline ? $mime : 'application/octet-stream',
            'Content-Length'          => (string) filesize($path),
            'Content-Disposition'     => $disposition,
            'X-Content-Type-Options'  => 'nosniff',
            'Cache-Control'           => 'private, no-store',
        ]);
        $response->filePath = $path;

        return $response;
    }

    public function withHeader(string $name, string $value): self
    {
        $this->headers[$name] = $value;

        return $this;
    }

    /**
     * @param array<string, mixed> $options Options de setcookie() : expires, path,
     *                                      secure, httponly, samesite.
     */
    public function withCookie(string $name, string $value, array $options): self
    {
        $this->cookies[] = ['name' => $name, 'value' => $value, 'options' => $options];

        return $this;
    }

    public function status(): int
    {
        return $this->status;
    }

    public function send(): void
    {
        if (headers_sent()) {
            return;
        }

        http_response_code($this->status);

        foreach ($this->headers as $name => $value) {
            header($name . ': ' . $value);
        }

        foreach ($this->cookies as $cookie) {
            setcookie($cookie['name'], $cookie['value'], $cookie['options']);
        }

        if ($this->filePath !== null) {
            readfile($this->filePath);

            return;
        }

        if ($this->rawBody !== null) {
            header('Content-Type: application/json; charset=utf-8');
            echo $this->rawBody;

            return;
        }

        if ($this->status === 204 || $this->status === 304 || $this->payload === null) {
            return;
        }

        header('Content-Type: application/json; charset=utf-8');

        echo json_encode(
            $this->payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        );
    }
}
