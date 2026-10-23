import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { formatDate } from '../../lib/format';
import { adminApi, errorMessage } from '../api';
import type { Procedure, ProcedureList } from '../types';
import { buttonClass, Notice, PageHeader, Spinner } from '../ui';

/**
 * Procédures : les étapes du suivi et les pièces à fournir, saisies une fois
 * pour toutes. À l'ouverture d'un dossier, on choisit la procédure et tout
 * est copié dans le dossier.
 *
 * Rangées par prestation du site, dans l'ordre de la page. Une prestation
 * sans procédure le dit : ses dossiers reçoivent les étapes et les pièces
 * par défaut.
 */
export default function ProceduresPage() {
  const [data, setData] = useState<ProcedureList | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .procedures()
      .then((response) => response.data && setData(response.data))
      .catch((caught) => setError(errorMessage(caught, 'Les procédures sont indisponibles.')));
  }, []);

  // Prestations du site dans leur ordre, puis celles retirées du site depuis.
  const services = data?.options.services ?? [];
  const groups = data
    ? [
        ...services.map((service) => ({ slug: service.value, label: service.label })),
        ...data.items
          .filter((item) => !services.some((service) => service.value === item.service))
          .map((item) => ({ slug: item.service, label: item.serviceLabel }))
          .filter((group, index, all) => all.findIndex((other) => other.slug === group.slug) === index),
      ].map((group) => ({ ...group, items: data.items.filter((item) => item.service === group.slug) }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        trail="Réglages"
        title="Procédures"
        description="Les étapes du suivi et les pièces à fournir, saisies une fois pour toutes : à l'ouverture d'un dossier, il suffit de choisir la procédure. La modifier ensuite ne change pas les dossiers déjà ouverts."
        actions={
          <Link to="/admin/procedures/nouvelle" className={buttonClass.primary}>
            <Icon name="add" size={20} />
            Nouvelle procédure
          </Link>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <Spinner />}

      {groups.map((group) => (
        <section
          key={group.slug}
          aria-labelledby={`prestation-${group.slug}`}
          className="overflow-hidden rounded-2xl border border-surface-container bg-white"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-surface-container px-5 py-4 sm:px-6">
            <h2 id={`prestation-${group.slug}`} className="text-base font-bold text-primary">
              {group.label}
            </h2>
            <p className="text-sm tabular-nums text-on-surface-variant">
              {group.items.length === 0
                ? 'Aucune procédure'
                : `${group.items.length} procédure${group.items.length > 1 ? 's' : ''}`}
            </p>
          </header>

          {group.items.length === 0 ? (
            <div className="flex flex-col items-start gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Ses dossiers reçoivent les étapes et les pièces par défaut.
              </p>
              <Link
                to={`/admin/procedures/nouvelle?prestation=${encodeURIComponent(group.slug)}`}
                className={`${buttonClass.secondary} shrink-0`}
              >
                <Icon name="add" size={18} />
                Créer sa procédure
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-surface-container">
              {group.items.map((procedure) => (
                <ProcedureRow key={procedure.id} procedure={procedure} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function ProcedureRow({ procedure }: { procedure: Procedure }) {
  const required = procedure.checklist.filter((piece) => piece.required).length;

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link
          to={`/admin/procedures/${procedure.id}`}
          className="w-fit text-[0.9375rem] font-semibold text-primary underline-offset-2 hover:underline"
        >
          {procedure.name}
        </Link>

        {/* Le circuit en une ligne : on reconnaît une procédure à ses étapes. */}
        <ol aria-label="Étapes du suivi" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-on-surface-variant">
          {procedure.steps.map((step, index) => (
            <li key={`${step.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <Icon name="chevron_right" size={14} className="text-outline" />}
              {step.label}
            </li>
          ))}
        </ol>

        <p className="text-xs tabular-nums text-on-surface-variant">
          {procedure.checklist.length === 0
            ? 'Aucune pièce'
            : `${procedure.checklist.length} pièce${procedure.checklist.length > 1 ? 's' : ''} à fournir, dont ${required} obligatoire${required > 1 ? 's' : ''}`}
          {' · '}modifiée le {formatDate(procedure.updatedAt)}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        {/* Dupliquer : le plus court chemin vers une variante (« – retraité(e) »). */}
        <Link to={`/admin/procedures/nouvelle?copie=${procedure.id}`} className={buttonClass.secondary}>
          <Icon name="content_copy" size={18} />
          Dupliquer
          <span className="sr-only"> : {procedure.name}</span>
        </Link>
        <Link to={`/admin/procedures/${procedure.id}`} className={buttonClass.secondary}>
          <Icon name="edit" size={18} />
          Modifier
          <span className="sr-only"> : {procedure.name}</span>
        </Link>
      </div>
    </li>
  );
}
