import { useEffect, useId, useRef } from 'react';
import Icon from '../ui/Icon';
import { brand } from '../ui/brand';
import type { Service, ServicePath } from '../../content/types';

/*
  Conditions d'admissibilité d'une prestation, dans une fenêtre ouverte
  depuis sa fiche (demande du 22/10/2026, à la place d'une section dédiée).

  Toutes les fenêtres sont pré-rendues, fermées : leur texte figure dans le
  HTML et reste lu par les moteurs de recherche. <dialog> natif, comme la
  médiathèque du panel : focus enfermé, Échap, reste de la page inerte. Le
  défilement de la page est bloqué tant qu'une fenêtre est ouverte
  (html:has(dialog[open]) dans index.css).
*/

/** Au-delà, une valeur n'est plus mise en avant : elle s'afficherait sur trois lignes. */
const SHORT_VALUE = 16;

/** La fiche a-t-elle des conditions à montrer ? Sinon, pas de bouton. */
export function hasConditions(service: Service): boolean {
  return (
    service.documents.length > 0 ||
    service.paths.some((path) => path.criteria.length > 0 || path.documents.length > 0)
  );
}

/** « Âge : 18 à 45 ans » → libellé et valeur ; une ligne sans deux-points n'a pas de libellé. */
function splitCriterion(line: string): { label: string; value: string } {
  const match = /^([^:]{1,40}?)\s*:\s+(.+)$/.exec(line);

  return match ? { label: match[1], value: match[2] } : { label: '', value: line };
}

/** « Bien immobilier (le cas échéant) » : la précision finale est atténuée. */
function DocumentText({ text }: { text: string }) {
  const match = /^(.+?)\s*(\([^()]+\))$/.exec(text);

  if (!match) return <>{text}</>;

  return (
    <>
      {match[1]} <span className="font-normal text-on-surface-variant">{match[2]}</span>
    </>
  );
}

const labelClass = 'text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-on-surface-variant';

function valueClass(big: boolean): string {
  return big
    ? 'text-lg font-extrabold leading-tight tracking-tight text-primary tabular-nums sm:text-2xl'
    : 'text-base font-bold leading-snug text-primary';
}

/** Une seule voie : libellé à gauche, valeur à droite (empilés au téléphone). */
function CriteriaList({ criteria }: { criteria: string[] }) {
  return (
    <dl className="flex flex-col">
      {criteria.map((line, index) => {
        const { label, value } = splitCriterion(line);

        return (
          <div
            key={`${line}-${index}`}
            className="grid gap-1 border-b border-dashed border-surface-container-high py-4 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:items-baseline sm:gap-4"
          >
            <dt className={labelClass}>{label}</dt>
            <dd className={valueClass(value.length <= SHORT_VALUE)}>{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Deux voies ou plus, côte à côte : une ligne par libellé, pour comparer
 * d'un coup d'œil (« Âge : 18 à 45 ans » face à « 20 à 50 ans »). Un critère
 * absent d'une voie y laisse un tiret. Chaque valeur rappelle sa voie aux
 * lecteurs d'écran, qui parcourent la grille dans l'ordre.
 */
function CriteriaComparison({ paths }: { paths: ServicePath[] }) {
  // Rangées dans l'ordre de première apparition, toutes voies confondues.
  const rows: { key: string; label: string }[] = [];
  const byPath = paths.map((path) => {
    const values = new Map<string, string>();

    path.criteria.forEach((line, index) => {
      const { label, value } = splitCriterion(line);
      // Une ligne sans libellé ne s'aligne sur rien : elle garde sa propre rangée.
      const key = label ? label.toLocaleLowerCase('fr') : `#${index}`;

      if (!rows.some((row) => row.key === key)) rows.push({ key, label });
      values.set(key, value);
    });

    return values;
  });

  return (
    <div
      className="grid gap-x-4 sm:gap-x-8"
      style={{ gridTemplateColumns: `repeat(${paths.length}, minmax(0, 1fr))` }}
    >
      {paths.map((path, index) => (
        <div key={`${path.title}-${index}`} className="flex flex-col gap-0.5 border-b border-surface-container-high pb-3 pt-5">
          <h3 className="text-base font-bold leading-snug text-primary">{path.title}</h3>
          {path.note && <p className="text-sm leading-snug text-on-surface-variant">{path.note}</p>}
        </div>
      ))}

      {rows.map((row) => {
        const values = byPath.map((values) => values.get(row.key));
        // Toute la rangée à la même taille : en grand seulement si chaque valeur est courte.
        const big = values.every((value) => value === undefined || value.length <= SHORT_VALUE);

        return (
          <div key={row.key} className="col-span-full grid grid-cols-subgrid">
            {row.label && <p className={`col-span-full pt-4 ${labelClass}`}>{row.label}</p>}
            {values.map((value, index) => (
              <p key={index} className="border-b border-dashed border-surface-container-high pb-4 pt-1">
                <span className="sr-only">{paths[index].title} : </span>
                {value === undefined ? (
                  <span className="text-base font-semibold text-outline">
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">non précisé</span>
                  </span>
                ) : (
                  <span className={`block ${valueClass(big)}`}>{value}</span>
                )}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Pièces à fournir : des cases à cocher dessinées, que l'on reporte sur sa propre liste. */
function DocumentList({ documents, columns = false }: { documents: string[]; columns?: boolean }) {
  return (
    <ul className={columns ? 'grid sm:grid-cols-2 sm:gap-x-6 md:grid-cols-3' : 'flex flex-col'}>
      {documents.map((document, index) => (
        <li
          key={`${document}-${index}`}
          // En colonnes, pas de filet : il soulignerait une rangée sur deux.
          className={`grid grid-cols-[1.125rem_1fr] items-start gap-3 py-2.5 text-[0.9375rem] font-medium leading-snug text-on-surface ${
            columns ? '' : 'border-b border-dashed border-surface-container-high last:border-b-0'
          }`}
        >
          <span aria-hidden="true" className="mt-0.5 h-[1.125rem] w-[1.125rem] rounded border-[1.5px] border-outline" />
          <span>
            <DocumentText text={document} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Colonnes remplies sans case vide : trois profils sur trois colonnes, pas deux plus un. */
function documentGridClass(count: number): string {
  if (count >= 3) return 'md:grid-cols-3';
  if (count === 2) return 'sm:grid-cols-2';

  return '';
}

export default function ServiceConditions({
  service,
  note,
  open,
  onClose,
}: {
  service: Service;
  /** Mention commune à toutes les prestations (champ `conditionsNote`). */
  note: string;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const colors = brand[service.color];

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const paths = service.paths.filter((path) => path.criteria.length > 0 || path.documents.length > 0);
  const withCriteria = paths.filter((path) => path.criteria.length > 0);
  const withDocuments = paths.filter((path) => path.documents.length > 0);
  // Au-delà de deux voies, la comparaison ne tient plus au téléphone : voies empilées.
  const compare = withCriteria.length === 2;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // Un clic sur le voile (hors de la fenêtre) la ferme.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
      // max-w-none : la feuille du navigateur borne <dialog> à 100 % - 2em - 6px.
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(100vw-1.25rem,56rem)] max-w-none overflow-hidden rounded-panel bg-white p-0 text-on-surface shadow-lifted transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop:bg-primary/60 starting:open:translate-y-3 starting:open:opacity-0"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex items-start gap-4 px-5 pb-4 pt-5 sm:px-8 sm:pt-7">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.soft} ${colors.text}`}>
            <Icon name={service.icon} size={24} />
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <h2 id={titleId} className="text-xl font-extrabold leading-tight tracking-tight text-primary sm:text-2xl">
              <span className="sr-only">Conditions d'admissibilité : </span>
              {service.title}
            </h2>
            {service.conditionsIntro && (
              <p className="text-sm font-medium leading-snug text-on-surface-variant">{service.conditionsIntro}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <Icon name="close" size={22} />
          </button>
        </header>

        {/* Le filet de la fiche, à la couleur de la prestation. */}
        <div aria-hidden="true" className="relative mx-5 h-0.5 shrink-0 bg-surface-container sm:mx-8">
          <span className={`absolute inset-y-0 left-0 w-16 rounded-full ${colors.solid}`} />
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto overscroll-contain px-5 pb-5 pt-2 sm:px-8 sm:pb-8">
          {withCriteria.length > 0 &&
            (compare ? (
              <CriteriaComparison paths={withCriteria} />
            ) : (
              <div className={`grid gap-x-8 ${documentGridClass(withCriteria.length)}`}>
                {withCriteria.map((path, index) => (
                  <section key={`${path.title}-${index}`} className="flex flex-col">
                    {path.title && (
                      <div className="flex flex-col gap-0.5 border-b border-surface-container-high pb-3 pt-5">
                        <h3 className="text-base font-bold leading-snug text-primary">{path.title}</h3>
                        {path.note && <p className="text-sm leading-snug text-on-surface-variant">{path.note}</p>}
                      </div>
                    )}
                    <CriteriaList criteria={path.criteria} />
                  </section>
                ))}
              </div>
            ))}

          {withDocuments.length > 0 && (
            <div className={`grid gap-x-8 ${documentGridClass(withDocuments.length)}`}>
              {withDocuments.map((path, index) => (
                // Titre et liste sur deux rangées partagées : les listes
                // commencent à la même hauteur, même sous un titre de deux lignes.
                <section key={`${path.title}-${index}`} className="row-span-2 grid min-w-0 grid-rows-subgrid gap-1 pt-4">
                  <h3 className="text-base font-bold leading-snug text-primary">
                    {/* Une voie qui a aussi des conditions : préciser que ce sont ses pièces. */}
                    {path.criteria.length > 0 ? `Pièces à fournir : ${path.title}` : path.title || 'Pièces à fournir'}
                  </h3>
                  <DocumentList documents={path.documents} />
                </section>
              ))}
            </div>
          )}

          {service.documents.length > 0 && (
            <section className="flex flex-col gap-1 border-t border-surface-container-high pt-5">
              <h3 className="text-base font-bold leading-snug text-primary">
                Pièces à fournir{paths.length > 1 ? ', quelle que soit la voie' : ''}
              </h3>
              <DocumentList documents={service.documents} columns />
            </section>
          )}

          <footer className="flex flex-col gap-4 rounded-card bg-surface-container-low p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5 sm:px-6">
            <p className="font-semibold text-primary sm:flex-1">Vous remplissez ces conditions ?</p>
            {/*
              Fermer avant de suivre le lien : la page, bloquée tant que la
              fenêtre est ouverte, peut alors défiler jusqu'au formulaire.
            */}
            <a
              href="#contact"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-on-secondary-fixed active:scale-[0.98]"
            >
              Démarrer ma procédure
              <Icon name="arrow_forward" size={18} />
            </a>
            {note && (
              <p className="flex gap-2 text-[0.8125rem] leading-relaxed text-on-surface-variant sm:basis-full">
                <Icon name="info" size={18} className="shrink-0" />
                {note}
              </p>
            )}
          </footer>
        </div>
      </div>
    </dialog>
  );
}
