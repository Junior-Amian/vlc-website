import Icon from '../../components/ui/Icon';
import type { Stats } from '../types';
import { change, formatNumber, formatPercent, timeAgo } from '../../lib/format';

type Figure = {
  label: string;
  value: string;
  /** Évolution relative (0,25 = +25 %), ou écart en points pour un taux. */
  delta: number | null;
  points?: boolean;
  hint: string;
};

function Delta({ delta, points, period }: { delta: number | null; points?: boolean; period: number }) {
  if (delta === null) {
    return <p className="text-xs text-on-primary-muted">Pas de comparaison possible</p>;
  }

  const up = delta > 0;
  const flat = Math.abs(delta) < 0.005;
  const text = points
    ? `${up ? '+' : ''}${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(delta * 100)} pt`
    : `${up ? '+' : ''}${formatPercent(delta)}`;

  // Direction portée par la flèche et le signe, pas par la couleur seule.
  return (
    <p className="flex items-center gap-1 text-xs text-on-primary-variant">
      {!flat && (
        <Icon
          name={up ? 'arrow_upward' : 'arrow_downward'}
          size={14}
          className={up ? 'text-tertiary-fixed' : 'text-secondary-container'}
        />
      )}
      <span className={flat ? '' : up ? 'font-semibold text-tertiary-fixed' : 'font-semibold text-secondary-container'}>
        {flat ? 'Stable' : text}
      </span>
      <span>par rapport aux {period} jours précédents</span>
    </p>
  );
}

/**
 * Chiffres clés de la période, présentés comme le tableau des départs du
 * site : chiffres jaunes sur fond marine, colonnes séparées par un filet.
 * C'est le seul élément appuyé du panel ; tout le reste est sobre.
 */
export default function StatBoard({ stats }: { stats: Stats }) {
  const { current, previous, days } = stats;
  const rate = current.visitors > 0 ? current.contactVisitors / current.visitors : 0;
  const previousRate = previous.visitors > 0 ? previous.contactVisitors / previous.visitors : null;
  const lastVisit = timeAgo(stats.lastVisitAt);

  const figures: Figure[] = [
    {
      label: 'Visiteurs',
      value: formatNumber(current.visitors),
      delta: change(current.visitors, previous.visitors),
      hint: 'Personnes différentes chaque jour, additionnées sur la période.',
    },
    {
      label: 'Pages vues',
      value: formatNumber(current.pageviews),
      delta: change(current.pageviews, previous.pageviews),
      hint: 'Chaque chargement du site compte pour une page vue.',
    },
    {
      label: 'Prises de contact',
      value: formatNumber(current.contacts),
      delta: change(current.contacts, previous.contacts),
      hint: 'Appels, WhatsApp, emails et formulaires envoyés depuis le site.',
    },
    {
      label: 'Taux de contact',
      value: formatPercent(rate),
      delta: previousRate === null ? null : rate - previousRate,
      points: true,
      hint: 'Part des visiteurs qui ont pris contact.',
    },
  ];

  return (
    <section aria-label="Chiffres clés" className="overflow-hidden rounded-3xl bg-primary text-white">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-white/10 px-5 py-3.5 sm:px-7">
        <p className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold">
          <Icon name="flight_takeoff" size={18} className="text-brand-yellow" />
          Fréquentation du site
        </p>
        <p className="text-xs text-on-primary-muted">{lastVisit ? `Dernière visite ${lastVisit}` : 'Aucune visite enregistrée'}</p>
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-4">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={`flex flex-col gap-2 px-5 py-5 sm:px-7 sm:py-6 ${
              index % 2 === 1 ? 'border-l border-white/10' : ''
            } ${index >= 2 ? 'border-t border-white/10 lg:border-t-0' : ''} ${index === 2 ? 'lg:border-l' : ''}`}
          >
            <dt className="text-sm text-on-primary-variant">{figure.label}</dt>
            <dd className="flex flex-col gap-2">
              <span
                className={`font-bold leading-none tracking-tight text-brand-yellow ${
                  index === 0 ? 'text-5xl' : 'text-[2rem] sm:text-4xl'
                }`}
              >
                {figure.value}
              </span>
              <Delta delta={figure.delta} points={figure.points} period={days} />
            </dd>
          </div>
        ))}
      </dl>

      {/*
        Ce que recouvre chaque chiffre, écrit plutôt qu'en infobulle : une
        infobulle (title) ne s'ouvre ni au clavier ni au doigt.
      */}
      <p className="border-t border-white/10 px-5 py-3 text-xs leading-relaxed text-on-primary-muted sm:px-7">
        {figures.map((figure) => `${figure.label} : ${figure.hint.charAt(0).toLowerCase()}${figure.hint.slice(1)}`).join(' ')}
      </p>
    </section>
  );
}
