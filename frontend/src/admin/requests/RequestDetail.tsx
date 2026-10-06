import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { adminApi, errorMessage } from '../api';
import { useAdmin } from '../AdminContext';
import type { ContactRequest, RequestStatus } from '../types';
import { formatDate } from '../../lib/format';
import { buttonClass, inputClass, Notice, Spinner } from '../ui';
import { firstName, STATUS_BADGE, STATUS_LABELS, whatsappNumber } from './status';

const STATUSES: RequestStatus[] = ['new', 'in_progress', 'done', 'spam'];

/**
 * Une demande de contact : le message, de quoi répondre en un geste
 * (appel, WhatsApp, email), son état de traitement et une note interne.
 */
export default function RequestDetail({
  id,
  onChange,
  onDelete,
}: {
  id: string;
  onChange: (request: ContactRequest) => void;
  onDelete: (id: string) => void;
}) {
  const { refreshRequests } = useAdmin();
  const [request, setRequest] = useState<ContactRequest | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handle = (caught: unknown) => setError(errorMessage(caught, 'Action impossible pour le moment.'));

  useEffect(() => {
    let cancelled = false;
    setRequest(null);
    setError(null);
    setSaved(null);

    adminApi
      .contactRequest(id)
      .then((response) => {
        if (cancelled || !response.data) return;
        setRequest(response.data);
        setNote(response.data.note);
        // L'ouverture a pu la faire passer de « nouvelle » à « en cours ».
        onChange(response.data);
        refreshRequests();
      })
      .catch((caught) => !cancelled && handle(caught));

    return () => {
      cancelled = true;
    };
    // Rechargée seulement quand on change de demande.
  }, [id]);

  const update = async (changes: { status?: RequestStatus; note?: string }, message: string) => {
    setBusy(true);
    setError(null);
    setSaved(null);

    try {
      const response = await adminApi.updateRequest(id, changes);

      if (response.data) {
        setRequest(response.data);
        setNote(response.data.note);
        onChange(response.data);
        setSaved(message);
        refreshRequests();
      }
    } catch (caught) {
      handle(caught);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!request || !window.confirm(`Supprimer définitivement la demande de ${request.fullName} ?`)) {
      return;
    }

    setBusy(true);

    try {
      await adminApi.deleteRequest(id);
      refreshRequests();
      onDelete(id);
    } catch (caught) {
      handle(caught);
      setBusy(false);
    }
  };

  if (!request) {
    return error ? <Notice tone="error">{error}</Notice> : <Spinner />;
  }

  const greeting = `Bonjour ${firstName(request.fullName)}, ici VISILION CORPORATE, suite à votre demande sur notre site.`;
  const mailto = `mailto:${request.email}?subject=${encodeURIComponent('Votre demande auprès de VISILION CORPORATE')}&body=${encodeURIComponent(`${greeting}\n\n`)}`;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-primary sm:text-2xl">{request.fullName}</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[request.status]}`}>
            {STATUS_LABELS[request.status]}
          </span>
        </div>
        <p className="text-sm text-on-surface-variant">Reçue le {formatDate(request.createdAt)}</p>

        {/* Libellés courts : les quatre actions tiennent sur un rang. */}
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={`https://wa.me/${whatsappNumber(request.phone)}?text=${encodeURIComponent(greeting)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass.primary}
          >
            <Icon name="chat" size={18} />
            WhatsApp
          </a>
          <a href={`tel:${request.phone.replace(/[^+\d]/g, '')}`} className={buttonClass.secondary}>
            <Icon name="call" size={18} />
            Appeler
          </a>
          <a href={mailto} className={buttonClass.secondary}>
            <Icon name="mail" size={18} />
            Email
          </a>
          {request.status !== 'spam' && (
            <Link to={`/admin/dossiers/nouveau?demande=${request.id}`} className={buttonClass.secondary}>
              <Icon name="folder_open" size={18} />
              Ouvrir un dossier
            </Link>
          )}
        </div>
      </header>

      <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-surface-container p-4 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-on-surface-variant">Téléphone</dt>
          <dd className="font-semibold text-on-surface select-all">{request.phone}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-on-surface-variant">Email</dt>
          <dd className="break-all font-semibold text-on-surface select-all">{request.email}</dd>
        </div>
      </dl>

      <section aria-labelledby={`message-${id}`} className="flex flex-col gap-2">
        <h3 id={`message-${id}`} className="text-sm font-semibold text-primary">
          Message
        </h3>
        <blockquote className="whitespace-pre-line rounded-2xl bg-surface-container-low p-4 text-[0.9375rem] leading-relaxed text-on-surface sm:p-5">
          {request.message}
        </blockquote>
      </section>

      {error && (
        <Notice tone="error" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}
      {saved && (
        <Notice tone="success" onClose={() => setSaved(null)}>
          {saved}
        </Notice>
      )}

      <fieldset className="flex flex-col gap-2" disabled={busy}>
        <legend className="mb-2 text-sm font-semibold text-primary">État du traitement</legend>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((status) => (
            <label key={status} className="cursor-pointer">
              <input
                type="radio"
                name={`etat-${id}`}
                value={status}
                checked={request.status === status}
                onChange={() => update({ status }, `Demande marquée « ${STATUS_LABELS[status].toLowerCase()} ».`)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 pointer-fine:min-h-10 items-center rounded-lg border border-surface-container-high bg-white px-3.5 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary/30 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary">
                {STATUS_LABELS[status]}
              </span>
            </label>
          ))}
        </div>
        {request.handledBy && (
          <p className="text-xs text-on-surface-variant">
            Dernière action de {request.handledBy}, le {formatDate(request.updatedAt)}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={`note-${id}`} className="text-sm font-semibold text-primary">
          Note interne
        </label>
        <textarea
          id={`note-${id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Ex. : rappelée le 3/10, rendez-vous fixé au bureau lundi."
          aria-describedby={`note-${id}-aide`}
          className={`${inputClass} resize-y leading-relaxed`}
        />
        <p id={`note-${id}-aide`} className="text-xs text-on-surface-variant">
          Visible seulement dans le panel, jamais par le client.
        </p>
        <button
          type="button"
          onClick={() => update({ note }, 'Note enregistrée.')}
          disabled={busy || note.trim() === request.note}
          className={`${buttonClass.secondary} w-fit`}
        >
          <Icon name="check" size={18} />
          Enregistrer la note
        </button>
      </div>

      <footer className="flex flex-col gap-4 border-t border-surface-container pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-on-surface-variant">
          <Icon name={request.emailSent ? 'mail' : 'error'} size={16} className="mt-px shrink-0" />
          {request.emailSent
            ? 'Notification envoyée par email à la réception.'
            : "La notification email n'est pas partie : cette demande n'est visible qu'ici."}
        </p>
        <button type="button" onClick={remove} disabled={busy} className={`${buttonClass.danger} shrink-0`}>
          <Icon name="delete" size={18} />
          Supprimer
        </button>
      </footer>
    </article>
  );
}
