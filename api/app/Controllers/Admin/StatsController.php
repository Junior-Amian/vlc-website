<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Controllers\TrackController;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Models\AnalyticsEvent;
use App\Models\Media;
use DateInterval;
use DatePeriod;
use DateTimeImmutable;

/**
 * Chiffres du tableau de bord : l'audience du site.
 *
 * GET /admin/stats?days=7|30|90. Chaque total est accompagné de celui de la
 * période précédente, de même durée, pour mesurer l'évolution.
 */
final class StatsController extends Controller
{
    private const PERIODS = [7, 30, 90];

    public function index(Request $request): Response
    {
        $days = (int) $request->input('days', 30);
        $days = in_array($days, self::PERIODS, true) ? $days : 30;

        $today = new DateTimeImmutable('today');
        $from = $today->sub(new DateInterval('P' . ($days - 1) . 'D'));
        $previousTo = $from->sub(new DateInterval('P1D'));
        $previousFrom = $previousTo->sub(new DateInterval('P' . ($days - 1) . 'D'));

        $f = $from->format('Y-m-d');
        $t = $today->format('Y-m-d');

        $events = new AnalyticsEvent();

        return Response::success([
            'days'     => $days,
            'from'     => $f,
            'to'       => $t,
            'current'  => $events->totals($f, $t),
            'previous' => $events->totals($previousFrom->format('Y-m-d'), $previousTo->format('Y-m-d')),
            'daily'    => $this->dailySeries($events, $from, $today),
            // Dans l'ordre de la page : on lit jusqu'où les visiteurs descendent.
            'sections' => $this->ordered(
                $events->countBy('section', 'name', $f, $t, distinct: true),
                TrackController::SECTIONS
            ),
            'actions'   => $this->ordered($events->countBy('action', 'name', $f, $t), TrackController::ACTIONS),
            'pages'     => $this->pairs($events->countBy('pageview', 'name', $f, $t, limit: 8)),
            'referrers' => $this->pairs($events->countBy('pageview', 'referrer', $f, $t, distinct: true, limit: 8)),
            'devices'   => $this->pairs($events->countBy('pageview', 'device', $f, $t, distinct: true)),
            'lastVisitAt' => $events->lastEventAt(),
        ]);
    }

    /** @return array<int, array{date: string, visitors: int, pageviews: int}> Un point par jour, jours sans visite compris. */
    private function dailySeries(AnalyticsEvent $events, DateTimeImmutable $from, DateTimeImmutable $to): array
    {
        $counts = $events->daily($from->format('Y-m-d'), $to->format('Y-m-d'));
        $series = [];

        foreach (new DatePeriod($from, new DateInterval('P1D'), $to->modify('+1 day')) as $day) {
            $date = $day->format('Y-m-d');
            $series[] = ['date' => $date, ...($counts[$date] ?? ['visitors' => 0, 'pageviews' => 0])];
        }

        return $series;
    }

    /**
     * @param array<string, int> $counts
     * @param string[]           $order
     * @return array<int, array{name: string, count: int}>
     */
    private function ordered(array $counts, array $order): array
    {
        return array_map(static fn (string $name): array => ['name' => $name, 'count' => $counts[$name] ?? 0], $order);
    }

    /**
     * @param array<string, int> $counts
     * @return array<int, array{name: string, count: int}>
     */
    private function pairs(array $counts): array
    {
        $pairs = [];

        foreach ($counts as $name => $count) {
            $pairs[] = ['name' => (string) $name, 'count' => $count];
        }

        return $pairs;
    }
}
