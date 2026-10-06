import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api';
import { timeAgo } from '../../lib/format';
import { STATUS_BADGE, STATUS_LABELS } from '../requests/status';
import type { ContactRequest } from '../types';
import { Panel } from '../ui';

/**
 * Les cinq dernières demandes à traiter, pour y répondre dès l'arrivée.
 *
 * Une panne de l'API s'affiche comme telle : présentée en liste vide, elle
 * laisserait croire qu'aucun client n'attend de réponse.
 */
export default function PendingRequests() {
  const [items, setItems] = useState<ContactRequest[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    adminApi
      .requests('open', '', 1)
      .then((response) => {
        setItems(response.data?.items.slice(0, 5) ?? []);
        setTotal(response.data?.total ?? 0);
      })
      .catch(() => setFailed(true));
  }, []);

  const subtitle = failed
    ? 'Les demandes n\'ont pas pu être chargées. Ouvrez la rubrique Demandes pour réessayer.'
    : items === null
      ? undefined
      : total === 0
        ? 'Aucune demande en attente.'
        : `${total} en attente de réponse.`;

  return (
    <Panel
      title="Demandes à traiter"
      subtitle={subtitle}
      aside={
        <Link
          to="/admin/demandes"
          className="-my-2 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-secondary hover:text-on-secondary-fixed"
        >
          Toutes les demandes
        </Link>
      }
    >
      {items !== null && items.length > 0 && (
        <ul className="-my-1 flex flex-col">
          {items.map((item) => (
            <li key={item.id} className="border-b border-surface-container last:border-b-0">
              <Link
                to={`/admin/demandes/${item.id}`}
                className="-mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-container-low"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${item.status === 'new' ? 'bg-secondary' : 'bg-transparent'}`}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
                  <span
                    className={`shrink-0 text-sm sm:w-44 sm:truncate ${
                      item.status === 'new' ? 'font-bold text-primary' : 'font-semibold text-on-surface'
                    }`}
                  >
                    {item.fullName}
                  </span>
                  <span className="truncate text-sm text-on-surface-variant">{item.message}</span>
                </span>
                <span
                  className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold sm:inline ${STATUS_BADGE[item.status]}`}
                >
                  {STATUS_LABELS[item.status]}
                </span>
                <span className="shrink-0 text-xs text-on-surface-variant">{timeAgo(item.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
