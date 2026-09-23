<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Réponse HTTP. Toutes les réponses de l'API sont du JSON.
 */
final class Response
{
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

    public function withHeader(string $name, string $value): self
    {
        $this->headers[$name] = $value;

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

        if ($this->status === 204 || $this->payload === null) {
            return;
        }

        header('Content-Type: application/json; charset=utf-8');

        echo json_encode(
            $this->payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        );
    }
}
