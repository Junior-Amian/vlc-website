import Icon from '../ui/Icon';
import { useContent } from '../../content/ContentProvider';
import type { Airport } from '../../content/types';

function DepartureList({ airports, hidden = false }: { airports: Airport[]; hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-baseline gap-10 pr-10">
      {airports.map((departure, index) => (
        <li key={`${departure.code}-${index}`} className="flex items-baseline gap-2.5 whitespace-nowrap">
          <span className="text-base font-bold tracking-wider text-brand-yellow">{departure.code}</span>
          <span className="text-sm text-on-primary-variant">{departure.city}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tableau des départs, sous la bannière : les destinations desservies
 * (section « Tableau des départs » du panel) défilent comme sur l'écran
 * d'un aéroport, en jaune (couleur du logo, contraste 10,85 sur le marine).
 *
 * La liste est doublée pour que la boucle soit continue ; la copie est
 * masquée aux lecteurs d'écran. Le défilement s'arrête au survol et devient
 * une liste statique quand l'utilisateur a réduit les animations (voir
 * .marquee dans styles/index.css).
 */
export default function DeparturesBoard() {
  const { departures } = useContent();

  return (
    <section
      aria-label="Destinations au départ d'Abidjan"
      className="border-t border-white/10 bg-primary"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-6 sm:px-8">
        <p className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-white sm:flex">
          <Icon name="flight_takeoff" size={20} className="text-brand-yellow" />
          {departures.label}
        </p>

        <div className="marquee relative min-w-0 flex-1 overflow-hidden">
          <div className="marquee-track flex w-max">
            <DepartureList airports={departures.airports} />
            <DepartureList airports={departures.airports} hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
