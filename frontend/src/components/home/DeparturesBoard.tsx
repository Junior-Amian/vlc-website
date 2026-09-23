import Icon from '../ui/Icon';

/*
  Destinations citées dans le cahier des charges (Canada, espace Schengen,
  Turquie, Chine), avec les codes IATA réels de leurs aéroports.
*/
const DEPARTURES = [
  { code: 'YUL', city: 'Montréal' },
  { code: 'YYZ', city: 'Toronto' },
  { code: 'CDG', city: 'Paris' },
  { code: 'LYS', city: 'Lyon' },
  { code: 'BRU', city: 'Bruxelles' },
  { code: 'FRA', city: 'Francfort' },
  { code: 'FCO', city: 'Rome' },
  { code: 'MAD', city: 'Madrid' },
  { code: 'IST', city: 'Istanbul' },
  { code: 'CAN', city: 'Canton' },
];

function DepartureList({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-baseline gap-10 pr-10">
      {DEPARTURES.map((departure) => (
        <li key={departure.code} className="flex items-baseline gap-2.5 whitespace-nowrap">
          <span className="text-base font-bold tracking-wider text-brand-yellow">{departure.code}</span>
          <span className="text-sm text-slate-300">{departure.city}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tableau des départs, sous la bannière : les destinations desservies
 * défilent comme sur l'écran d'un aéroport, en jaune (couleur du logo,
 * contraste 10,85 sur le marine).
 *
 * La liste est doublée pour que la boucle soit continue ; la copie est
 * masquée aux lecteurs d'écran. Le défilement s'arrête au survol et devient
 * une liste statique quand l'utilisateur a réduit les animations (voir
 * .marquee dans styles/index.css).
 */
export default function DeparturesBoard() {
  return (
    <section
      aria-label="Destinations au départ d'Abidjan"
      className="border-t border-white/10 bg-primary"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-6 sm:px-8">
        <p className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-white sm:flex">
          <Icon name="flight_takeoff" size={20} className="text-brand-yellow" />
          Départs d'Abidjan
        </p>

        <div className="marquee relative min-w-0 flex-1 overflow-hidden">
          <div className="marquee-track flex w-max">
            <DepartureList />
            <DepartureList hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
