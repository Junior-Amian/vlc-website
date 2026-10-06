import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { formatMoney, timeAgo } from '../../lib/format';
import { adminApi, errorMessage } from '../api';
import type { DossierFilter, DossierList, DossierSummary } from '../types';
import { Avatar, buttonClass, inputClass, Notice, PageHeader } from '../ui';

/** Portée de la liste ; « À vérifier » et « Messages » se choisissent par les indicateurs. */
const SCOPES: { value: DossierFilter; label: string }[] = [
  { value: 'open', label: 'En cours' },
  { value: 'closed', label: 'Terminés' },
  { value: 'all', label: 'Tous' },
];

type SortKey = 'client' | 'step' | 'balance' | 'activity';
type Sort = { key: SortKey; direction: 'asc' | 'desc' };

/** Reste à payer, ou null si le montant n'est pas fixé. */
function balanceOf(item: DossierSummary): number | null {
  return item.total !== null ? Math.max(0, item.total - item.paid) : null;
}

const COMPARE: Record<SortKey, (a: DossierSummary, b: DossierSummary) => number> = {
  client: (a, b) => a.clientName.localeCompare(b.clientName, 'fr'),
  step: (a, b) => a.step - b.step,
  // Montant non fixé : rangé avec les soldes nuls.
  balance: (a, b) => (balanceOf(a) ?? 0) - (balanceOf(b) ?? 0),
  activity: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
};

/**
 * Dossiers clients : quatre indicateurs en tête, puis le tableau de tous les
 * dossiers (une carte par dossier au téléphone).
 *
 * Les indicateurs « À vérifier » et « Messages » filtrent sur ce qui attend
 * l'équipe ; la barre d'outils choisit la portée (en cours, terminés, tous),
 * l'étape et la recherche. Le tri se fait dans le navigateur : la liste
 * compte au plus quelques centaines de dossiers (Dossier::search).
 */
export default function DossiersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DossierFilter>('open');
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>({ key: 'activity', direction: 'desc' });
  const [data, setData] = useState<DossierList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    adminApi
      .dossiers(filter, query, step)
      .then((response) => !cancelled && response.data && setData(response.data))
      .catch((caught) => !cancelled && setError(errorMessage(caught, 'Les dossiers sont indisponibles.')))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [filter, query, step]);

  const steps = data?.steps ?? [];
  const overview = data?.overview;

  const items = useMemo(() => {
    const list = [...(data?.items ?? [])];
    const compare = COMPARE[sort.key];

    return list.sort((a, b) => (sort.direction === 'asc' ? compare(a, b) : compare(b, a)));
  }, [data, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'client' || key === 'step' ? 'asc' : 'desc' },
    );

  const filtered = query !== '' || step !== 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dossiers clients"
        description="Le suivi de tous les dossiers ouverts dans l'espace client."
        actions={
          <Link to="/admin/dossiers/nouveau" className={buttonClass.primary}>
            <Icon name="add" size={20} />
            Ouvrir un dossier
          </Link>
        }
      />

      {/*
        Indicateurs : les trois premiers filtrent la liste, le dernier la
        résume. Au téléphone, les trois compteurs tiennent sur une ligne et le
        montant, trop long pour un tiers d'écran, prend la ligne suivante.
      */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-4">
        <Metric
          label="En cours"
          value={overview?.counts.open}
          active={filter === 'open'}
          onClick={() => setFilter('open')}
          hint="dossiers"
        />
        <Metric
          label="Pièces à vérifier"
          value={overview?.counts.review}
          tone="secondary"
          active={filter === 'review'}
          onClick={() => setFilter(filter === 'review' ? 'open' : 'review')}
          hint="dossiers"
        />
        <Metric
          label="Messages non lus"
          value={overview?.counts.messages}
          tone="blue"
          active={filter === 'messages'}
          onClick={() => setFilter(filter === 'messages' ? 'open' : 'messages')}
          hint="dossiers"
        />
        <Metric
          wide
          label="Reste à encaisser"
          value={overview ? formatMoney(overview.outstanding) : undefined}
          hint={
            overview && overview.pendingInvitations > 0
              ? `${overview.pendingInvitations} invitation${overview.pendingInvitations > 1 ? 's' : ''} en attente`
              : 'sur les dossiers en cours'
          }
        />
      </div>

      <section aria-label="Liste des dossiers" className="overflow-hidden rounded-2xl border border-surface-container bg-white">
        <div className="flex flex-col gap-3 border-b border-surface-container p-4 lg:flex-row lg:items-center">
          <div className="relative lg:w-80">
            <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <label htmlFor="recherche-dossiers" className="sr-only">
              Rechercher un dossier
            </label>
            <input
              id="recherche-dossiers"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, email, téléphone, pays…"
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="etape-dossiers" className="sr-only">
              Étape
            </label>
            <select
              id="etape-dossiers"
              value={step}
              onChange={(event) => setStep(Number(event.target.value))}
              // Largeur à son contenu : inputClass occupe toute la ligne par défaut.
              className={`${inputClass.replace('w-full', 'w-auto')} max-w-full`}
            >
              <option value={0}>Toutes les étapes</option>
              {steps.map((candidate) => (
                <option key={candidate.number} value={candidate.number}>
                  {candidate.number}. {candidate.label} ({overview?.byStep[String(candidate.number)] ?? 0})
                </option>
              ))}
            </select>

            <div role="group" aria-label="Portée de la liste" className="inline-flex rounded-xl bg-surface-container-low p-1">
              {SCOPES.map((scope) => {
                const active = scope.value === filter;

                return (
                  <button
                    key={scope.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(scope.value)}
                    className={`inline-flex min-h-10 pointer-fine:min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
                      active ? 'bg-white text-primary shadow-ambient' : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    {scope.label}
                    {overview && <span className="text-xs tabular-nums text-on-surface-variant">{overview.counts[scope.value]}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <p aria-live="polite" className="text-sm text-on-surface-variant lg:ml-auto">
            {data && !loading && `${items.length} dossier${items.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {(filter === 'review' || filter === 'messages' || filtered) && (
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-container bg-surface-container-low/60 px-4 py-2.5 text-sm text-on-surface-variant">
            <span>
              {filter === 'review' && 'Dossiers avec des pièces à vérifier'}
              {filter === 'messages' && 'Dossiers avec un message non lu'}
              {filter !== 'review' && filter !== 'messages' && 'Liste filtrée'}
            </span>
            <button
              type="button"
              onClick={() => {
                setFilter('open');
                setStep(0);
                setSearch('');
              }}
              className="font-semibold text-secondary-ink underline-offset-2 hover:underline"
            >
              Tout afficher
            </button>
          </div>
        )}

        {error && (
          <div className="p-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        {!error && !data && <SkeletonRows />}

        {data && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
              <Icon name={filtered ? 'search' : 'folder_open'} size={24} />
            </span>
            <p className="max-w-sm text-sm leading-relaxed text-on-surface-variant">
              {query
                ? 'Aucun dossier ne correspond à cette recherche.'
                : filter === 'review'
                  ? 'Aucune pièce en attente de vérification.'
                  : filter === 'messages'
                    ? 'Aucun message de client en attente de lecture.'
                    : step
                      ? 'Aucun dossier à cette étape.'
                      : "Aucun dossier ici. Ouvrez-en un depuis une demande de contact, ou avec le bouton « Ouvrir un dossier »."}
            </p>
          </div>
        )}

        {data && items.length > 0 && (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {/* Grand écran : le tableau. */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-surface-container text-xs font-semibold text-on-surface-variant">
                  <SortHeader label="Client" sortKey="client" sort={sort} onSort={toggleSort} className="pl-4" />
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Prestation
                  </th>
                  <SortHeader label="Étape" sortKey="step" sort={sort} onSort={toggleSort} />
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Pièces
                  </th>
                  <SortHeader label="Solde" sortKey="balance" sort={sort} onSort={toggleSort} align="right" />
                  <SortHeader label="Activité" sortKey="activity" sort={sort} onSort={toggleSort} align="right" className="pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    // Toute la ligne ouvre le dossier à la souris ; au clavier, c'est le lien du nom.
                    onClick={() => navigate(`/admin/dossiers/${item.id}`)}
                    className="cursor-pointer transition-colors hover:bg-surface-container-low"
                  >
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={item.clientName} className="h-9 w-9 text-xs" />
                        <div className="min-w-0">
                          <Link
                            to={`/admin/dossiers/${item.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="block truncate font-bold text-primary hover:underline"
                          >
                            {item.clientName}
                          </Link>
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-on-surface-variant">
                            <span className="whitespace-nowrap">{item.reference}</span>
                            <Alerts item={item} />
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-medium text-on-surface">{item.service.label}</span>
                      <span className="block text-xs text-on-surface-variant">{item.country || '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <StepProgress step={item.step} total={steps.length || 5} label={steps.find((s) => s.number === item.step)?.label} />
                    </td>
                    <td className="px-3 py-3">
                      <Pieces item={item} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Balance item={item} />
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right text-xs text-on-surface-variant">{timeAgo(item.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Téléphone et tablette : une carte par dossier. */}
            <ul className="divide-y divide-surface-container md:hidden">
              {items.map((item) => (
                <li key={item.id}>
                  <Link to={`/admin/dossiers/${item.id}`} className="flex flex-col gap-3 p-4 transition-colors active:bg-surface-container-low">
                    <span className="flex items-start gap-3">
                      <Avatar name={item.clientName} className="h-9 w-9 text-xs" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-bold text-primary">{item.clientName}</span>
                          <span className="shrink-0 text-xs text-on-surface-variant">{timeAgo(item.updatedAt)}</span>
                        </span>
                        <span className="block truncate text-sm text-on-surface-variant">
                          {item.service.label}
                          {item.country && ` · ${item.country}`}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-on-surface-variant">
                          <span className="whitespace-nowrap">{item.reference}</span>
                          <Alerts item={item} />
                        </span>
                      </span>
                    </span>
                    <StepProgress step={item.step} total={steps.length || 5} label={steps.find((s) => s.number === item.step)?.label} />
                    <span className="flex items-center justify-between gap-3 text-sm">
                      <Pieces item={item} />
                      <Balance item={item} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

/** Indicateur en tête de page ; cliquable quand il filtre la liste. */
function Metric({
  label,
  value,
  hint,
  tone,
  active = false,
  wide = false,
  onClick,
}: {
  label: string;
  value: number | string | undefined;
  hint?: string;
  tone?: 'secondary' | 'blue';
  active?: boolean;
  /** Toute la largeur sous lg (montant). */
  wide?: boolean;
  onClick?: () => void;
}) {
  // Un chiffre non nul de choses à faire porte une pastille de couleur.
  const alert = tone && typeof value === 'number' && value > 0;
  const dot = tone === 'secondary' ? 'bg-secondary' : 'bg-brand-blue';

  const content: ReactNode = (
    <>
      <span className="flex items-start gap-1.5 text-xs font-medium leading-snug text-on-surface-variant sm:text-sm">
        {alert && <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />}
        {label}
      </span>
      <span className="text-2xl font-extrabold tracking-tight tabular-nums text-primary sm:text-[1.75rem]">
        {value ?? <span className="inline-block h-7 w-16 animate-pulse rounded-md bg-surface-container align-middle" />}
      </span>
      {hint && <span className="text-xs text-on-surface-variant">{hint}</span>}
    </>
  );

  const base = `flex min-h-28 flex-col justify-between gap-1 rounded-2xl border bg-white p-3 text-left sm:p-5 ${wide ? 'col-span-3 lg:col-span-1' : ''}`;

  if (!onClick) {
    return <div className={`${base} border-surface-container`}>{content}</div>;
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${base} transition-[border-color,box-shadow] duration-150 ${
        active ? 'border-primary shadow-ambient ring-1 ring-primary' : 'border-surface-container hover:border-primary/30'
      }`}
    >
      {content}
    </button>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
  className = '',
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const active = sort.key === sortKey;

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-1.5 font-semibold ${align === 'right' ? 'text-right' : ''} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex min-h-9 items-center gap-1 rounded-md transition-colors hover:text-primary ${active ? 'text-primary' : ''}`}
      >
        {label}
        <span className={`inline-flex w-4 ${active ? '' : 'opacity-0'}`}>
          <Icon name={active && sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'} size={14} />
        </span>
      </button>
    </th>
  );
}

/** Ce qui attend l'équipe ou le client sur ce dossier. */
function Alerts({ item }: { item: DossierSummary }) {
  return (
    <>
      {item.unreadMessages > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue-soft px-1.5 py-px font-semibold text-brand-blue">
          <Icon name="chat" size={12} />
          {item.unreadMessages}
          <span className="sr-only"> message{item.unreadMessages > 1 ? 's' : ''} non lu{item.unreadMessages > 1 ? 's' : ''}</span>
        </span>
      )}
      {!item.clientActive && (
        <span className="whitespace-nowrap rounded-full bg-brand-yellow-soft px-1.5 py-px font-semibold text-brand-yellow-ink">Invitation en attente</span>
      )}
    </>
  );
}

function StepProgress({ step, total, label }: { step: number; total: number; label?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="truncate text-sm font-medium text-on-surface">
        <span className="tabular-nums text-on-surface-variant">{step}/{total}</span> {label}
      </span>
      <span aria-hidden="true" className="grid max-w-40 gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={`h-1.5 rounded-full ${index < step ? 'bg-secondary' : 'bg-surface-container'}`} />
        ))}
      </span>
    </div>
  );
}

function Pieces({ item }: { item: DossierSummary }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="tabular-nums text-on-surface">
        {item.itemsValidated}/{item.itemsRequired}
        <span className="text-on-surface-variant"> validées</span>
      </span>
      {item.itemsToReview > 0 && (
        <span className="rounded-full bg-secondary-container px-2 py-0.5 text-xs font-bold text-primary">{item.itemsToReview} à vérifier</span>
      )}
    </span>
  );
}

function Balance({ item }: { item: DossierSummary }) {
  const balance = balanceOf(item);

  if (balance === null) {
    return <span className="text-on-surface-variant">À fixer</span>;
  }

  if (balance === 0) {
    return <span className="font-semibold text-brand-green">Réglé</span>;
  }

  return <span className="font-semibold tabular-nums text-primary">{formatMoney(balance)}</span>;
}

/** Lignes fantômes pendant le premier chargement : la page garde sa forme. */
function SkeletonRows() {
  return (
    <div role="status" aria-label="Chargement des dossiers" className="divide-y divide-surface-container">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 p-4">
          <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-surface-container" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3 w-40 animate-pulse rounded bg-surface-container" />
            <span className="h-2.5 w-24 animate-pulse rounded bg-surface-container" />
          </span>
          <span className="hidden h-3 w-32 animate-pulse rounded bg-surface-container md:block" />
        </div>
      ))}
    </div>
  );
}
