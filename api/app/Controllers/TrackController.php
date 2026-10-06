<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Analytics\VisitorId;
use App\Auth\AdminSession;
use App\Core\Controller;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Models\AnalyticsEvent;
use Throwable;

/**
 * Réception des mesures d'audience envoyées par le site
 * (frontend/src/lib/analytics.ts).
 *
 * Répond toujours 204, même quand rien n'est enregistré : le site n'attend
 * rien en retour, et un robot n'apprend pas ainsi qu'il est écarté.
 */
final class TrackController extends Controller
{
    /** Sections suivies, identifiants des <section> de la page. */
    public const SECTIONS = ['accueil', 'fondateurs', 'services', 'college-universel', 'temoignages', 'espace-client', 'contact'];

    /** Prises de contact suivies. */
    public const ACTIONS = ['call', 'whatsapp', 'email', 'contact_form'];

    private const MAX_EVENTS = 20;

    private const BOTS = '/bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|curl|wget|python|java\/|go-http|axios|node-fetch/i';

    public function store(Request $request): Response
    {
        $userAgent = (string) $request->header('User-Agent', '');

        // Robots, et administrateurs connectés : leurs visites de contrôle ne
        // doivent pas gonfler les chiffres qu'ils consultent.
        if ($userAgent === '' || preg_match(self::BOTS, $userAgent) === 1 || AdminSession::claims($request) !== null) {
            return Response::noContent();
        }

        $events = $this->events($request);

        if ($events === []) {
            return Response::noContent();
        }

        try {
            (new AnalyticsEvent())->record(
                $events,
                VisitorId::for($request->ip, $userAgent),
                self::device($userAgent)
            );
        } catch (Throwable $e) {
            // La mesure d'audience ne doit jamais faire échouer le site.
            Logger::warning('Mesure d\'audience non enregistrée', ['message' => $e->getMessage()]);
        }

        return Response::noContent();
    }

    /** @return array<int, array{type: string, name: string, referrer: ?string}> */
    private function events(Request $request): array
    {
        $raw = $request->input('events');

        if (!is_array($raw)) {
            return [];
        }

        $referrer = $this->referrerHost($request->input('referrer'), (string) $request->header('Host', ''));
        $events = [];

        foreach (array_slice($raw, 0, self::MAX_EVENTS) as $event) {
            $type = is_array($event) ? ($event['type'] ?? null) : null;
            $name = is_array($event) && is_string($event['name'] ?? null) ? $event['name'] : '';

            $valid = match ($type) {
                'pageview' => preg_match('#^/[a-zA-Z0-9/_\-.]{0,119}$#', $name) === 1,
                'section'  => in_array($name, self::SECTIONS, true),
                'action'   => in_array($name, self::ACTIONS, true),
                default    => false,
            };

            if ($valid) {
                $events[] = ['type' => $type, 'name' => $name, 'referrer' => $type === 'pageview' ? $referrer : null];
            }
        }

        return $events;
    }

    /** Domaine du site de provenance, sans le chemin (qui peut contenir des données personnelles). */
    private function referrerHost(mixed $referrer, string $ownHost): ?string
    {
        if (!is_string($referrer) || $referrer === '') {
            return null;
        }

        $host = strtolower((string) parse_url($referrer, PHP_URL_HOST));
        $host = (string) preg_replace('/^www\./', '', $host);
        $own = (string) preg_replace('/^www\./', '', strtolower(explode(':', $ownHost)[0]));

        if ($host === '' || $host === $own || strlen($host) > 120 || preg_match('/^[a-z0-9.-]+$/', $host) !== 1) {
            return null;
        }

        return $host;
    }

    private static function device(string $userAgent): string
    {
        return match (true) {
            preg_match('/iPad|Tablet|Android(?!.*Mobile)/i', $userAgent) === 1 => 'tablet',
            preg_match('/Mobi|iPhone|iPod|Android/i', $userAgent) === 1        => 'mobile',
            default                                                            => 'desktop',
        };
    }
}
