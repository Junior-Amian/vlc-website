<?php

declare(strict_types=1);

use App\Core\Env;

$origins = array_filter(
    array_map('trim', explode(',', (string) Env::get('CORS_ALLOWED_ORIGINS', '')))
);

return [
    'allowed_origins' => $origins === [] ? ['http://localhost:5173'] : $origins,
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-HTTP-Method-Override'],
    'max_age'         => 86400,
];
