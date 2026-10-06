<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Content\ContentPublisher;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;

/**
 * Contenu public du site, tel que modifié dans le panel.
 *
 * Le site pré-rendu affiche d'abord le contenu intégré à sa compilation, puis
 * celui-ci dès qu'il arrive (frontend/src/content/ContentProvider.tsx). Une
 * section absente de la réponse garde sa version compilée.
 */
final class ContentController extends Controller
{
    public function show(Request $request): Response
    {
        $json = (new ContentPublisher())->json();
        $etag = '"' . md5($json) . '"';

        // no-cache : le navigateur garde sa copie mais la revalide à chaque
        // visite, si bien qu'une modification du panel se voit aussitôt.
        if ($request->header('If-None-Match') === $etag) {
            return (new Response(null, 304))
                ->withHeader('ETag', $etag)
                ->withHeader('Cache-Control', 'no-cache');
        }

        return Response::successJson($json)
            ->withHeader('ETag', $etag)
            ->withHeader('Cache-Control', 'no-cache');
    }
}
