import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { adminApi, errorMessage } from '../api';
import { timeAgo } from '../../lib/format';
import RequestDetail from '../requests/RequestDetail';
import { FILTERS, STATUS_BADGE, STATUS_LABELS } from '../requests/status';
import type { ContactRequest, RequestCounts, RequestFilter } from '../types';
import { buttonClass, inputClass, Notice, PageHeader, Spinner } from '../ui';

function filterCount(filter: RequestFilter, counts: RequestCounts | null): number | null {
  if (!counts) return null;

  switch (filter) {
    case 'open':
      return counts.new + counts.in_progress;
    case 'done':
      return counts.done;
    case 'spam':
      return counts.spam;
    default:
      return counts.new + counts.in_progress + counts.done;
  }
}

/**
 * Demandes envoyées par le formulaire de contact.
 *
 * Grand écran : la liste à gauche, la demande ouverte à droite. Mobile : la
 * liste, puis la demande sur son propre écran (/admin/demandes/12), avec un
 * retour à la liste.
 */
export default function RequestsPage() {
  const { id: idParam } = useParams();
  const selectedId = idParam ?? null;
  const navigate = useNavigate();

  const [filter, setFilter] = useState<RequestFilter>('open');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ContactRequest[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<RequestCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // La recherche part 300 ms après la dernière frappe, pas à chaque lettre.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    (nextPage: number) => {
      setError(null);

      return adminApi
        .requests(filter, query, nextPage)
        .then((response) => {
          const data = response.data;

          if (!data) return;

          setItems((current) => (nextPage === 1 ? data.items : [...(current ?? []), ...data.items]));
          setTotal(data.total);
          setPage(data.page);
          setCounts(data.counts);
        })
        .catch((caught) => setError(errorMessage(caught, 'Les demandes sont indisponibles.')));
    },
    [filter, query],
  );

  useEffect(() => {
    setItems(null);
    load(1);
  }, [load]);

  // Les compteurs des filtres suivent chaque changement d'état. La demande,
  // elle, reste à sa place dans la liste jusqu'au prochain chargement : on
  // voit ce qu'on vient de changer.
  const refreshCounts = () =>
    adminApi
      .requestCounts()
      .then((response) => response.data && setCounts(response.data))
      .catch(() => undefined);

  const replace = (request: ContactRequest) => {
    setItems((current) => current?.map((item) => (item.id === request.id ? request : item)) ?? current);
    refreshCounts();
  };

  const removed = (id: string) => {
    setItems((current) => current?.filter((item) => item.id !== id) ?? current);
    setTotal((current) => Math.max(0, current - 1));
    refreshCounts();
    navigate('/admin/demandes');
  };

  /*
    Filtres et recherche au-dessus des deux colonnes : dans la colonne de la
    liste, trop étroite, « Toutes » passait à la ligne. Ici tout tient sur une
    ligne, et la liste et la demande ouverte commencent à la même hauteur.
  */
  const toolbar = (
    <div className={`flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${selectedId !== null ? 'hidden lg:flex' : 'flex'}`}>
      {/* Au téléphone, deux rangées de deux plutôt qu'un filtre seul en bout de ligne. */}
      <div role="group" aria-label="Filtrer les demandes" className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
        {FILTERS.map((option) => {
          const count = filterCount(option.value, counts);
          const active = option.value === filter;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.value)}
              className={`inline-flex min-h-11 pointer-fine:min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                active ? 'bg-primary text-white' : 'bg-white text-on-surface-variant hover:text-primary'
              }`}
            >
              {option.label}
              {count !== null && (
                <span className={`text-xs tabular-nums ${active ? 'text-on-primary-variant' : 'text-on-surface-variant'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="relative sm:w-80">
        <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <label htmlFor="recherche-demandes" className="sr-only">
          Rechercher une demande
        </label>
        <input
          id="recherche-demandes"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nom, téléphone, email, message…"
          className={`${inputClass} pl-10`}
        />
      </div>
    </div>
  );

  const list = (
    <div className="flex flex-col gap-4">
      {error && <Notice tone="error">{error}</Notice>}
      {items === null && !error && <Spinner />}

      {items !== null && items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-surface-container-high px-5 py-8 text-center text-sm leading-relaxed text-on-surface-variant">
          {query
            ? 'Aucune demande ne correspond à cette recherche.'
            : filter === 'open'
              ? 'Aucune demande en attente : tout est traité.'
              : 'Aucune demande ici.'}
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const selected = item.id === selectedId;
            const unread = item.status === 'new';

            return (
              <li key={item.id}>
                <Link
                  to={`/admin/demandes/${item.id}`}
                  aria-current={selected ? 'true' : undefined}
                  className={`flex flex-col gap-1.5 rounded-xl border p-3.5 transition-colors ${
                    selected
                      ? 'border-primary bg-white shadow-ambient'
                      : 'border-surface-container bg-white hover:border-primary/25'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {unread && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-secondary" />}
                    <span className={`min-w-0 flex-1 truncate text-sm ${unread ? 'font-bold text-primary' : 'font-semibold text-on-surface'}`}>
                      {item.fullName}
                    </span>
                    <span className="shrink-0 text-xs text-on-surface-variant">{timeAgo(item.createdAt)}</span>
                  </span>
                  <span className="line-clamp-2 text-sm leading-snug text-on-surface-variant">{item.message}</span>
                  <span className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="truncate text-xs text-on-surface-variant">{item.phone}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {items !== null && items.length < total && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => {
            setLoadingMore(true);
            load(page + 1)?.finally(() => setLoadingMore(false));
          }}
          className={`${buttonClass.secondary} w-full`}
        >
          Afficher les suivantes ({total - items.length})
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demandes de contact"
        description="Les messages envoyés par le formulaire du site. Une demande ouverte passe « en cours » ; marquez-la « traitée » une fois le client recontacté."
      />

      {toolbar}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Sur mobile, la liste laisse la place à la demande ouverte. */}
        <div className={selectedId !== null ? 'hidden lg:block' : ''}>{list}</div>

        {selectedId !== null ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-surface-container bg-white p-5 sm:p-7 lg:sticky lg:top-6">
            <Link
              to="/admin/demandes"
              className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-primary lg:hidden"
            >
              <Icon name="arrow_back" size={18} />
              Toutes les demandes
            </Link>
            <RequestDetail key={selectedId} id={selectedId} onChange={replace} onDelete={removed} />
          </div>
        ) : (
          <div className="hidden min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-container-high p-8 text-center lg:flex">
            <Icon name="inbox" size={36} className="text-on-surface-variant" />
            <p className="max-w-xs text-sm leading-relaxed text-on-surface-variant">
              Choisissez une demande dans la liste pour lire le message et répondre au client.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
