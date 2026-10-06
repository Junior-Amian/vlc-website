import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { formatDate, formatLongDate } from '../../lib/format';
import { adminApi, errorMessage } from '../api';
import ChecklistPanel, { type Save } from '../dossiers/ChecklistPanel';
import InvitationLink from '../dossiers/InvitationLink';
import MessagesPanel from '../dossiers/MessagesPanel';
import PaymentsPanel from '../dossiers/PaymentsPanel';
import type { AdminDossier, Invitation } from '../types';
import { ButtonSpinner, buttonClass, inputClass, Notice, PageHeader, Panel, Spinner } from '../ui';

/**
 * Fiche d'un dossier : tout ce que le client voit dans son espace, et de
 * quoi le faire avancer. Chaque modification renvoie le dossier entier, qui
 * remplace la copie affichée.
 */
export default function DossierPage() {
  const { id } = useParams();
  const dossierId = id ?? '';
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<AdminDossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .dossier(dossierId)
      .then((response) => response.data && setDossier(response.data))
      .catch((caught) => setError(errorMessage(caught, 'Ce dossier est indisponible.')));
  }, [dossierId]);

  const save: Save = useCallback(async (action) => {
    setSaveError(null);
    setSaved(null);

    try {
      const response = await action();

      if (response.data) {
        setDossier(response.data);
      }

      setSaved(response.message ?? null);

      return true;
    } catch (caught) {
      setSaveError(errorMessage(caught, "La modification n'a pas pu être enregistrée."));

      return false;
    }
  }, []);

  if (error) {
    return <Notice tone="error">{error}</Notice>;
  }

  if (!dossier) {
    return <Spinner />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        trail={dossier.reference}
        title={dossier.client.fullName}
        description={`${dossier.service.label}${dossier.country ? ` · ${dossier.country}` : ''} · ouvert le ${formatLongDate(dossier.createdAt)}`}
        actions={
          <Link to="/admin/dossiers" className={buttonClass.secondary}>
            <Icon name="arrow_back" size={18} />
            Tous les dossiers
          </Link>
        }
      />

      {/* Message de la dernière action : collé en haut, visible quel que soit le bloc modifié. */}
      <div aria-live="polite" className="sticky top-2 z-10 empty:hidden">
        {saveError && (
          <Notice tone="error" onClose={() => setSaveError(null)}>
            {saveError}
          </Notice>
        )}
        {saved && !saveError && (
          <Notice tone="success" onClose={() => setSaved(null)}>
            {saved}
          </Notice>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <StepPanel dossier={dossier} save={save} />
          <MessagesPanel dossier={dossier} />
          <ChecklistPanel dossier={dossier} save={save} />
          <PaymentsPanel key={dossier.finance.total ?? 'none'} dossier={dossier} save={save} />
        </div>

        <div className="flex flex-col gap-6">
          <ClientPanel dossier={dossier} save={save} />
          <NotePanel dossier={dossier} save={save} />
          <Panel title="Supprimer le dossier">
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Supprime le dossier, l'accès du client et tous ses documents. Irréversible.
            </p>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`Supprimer définitivement le dossier de ${dossier.client.fullName} et tous ses documents ?`)) {
                  return;
                }

                if (await save(() => adminApi.deleteDossier(dossier.id).then(() => ({})))) {
                  navigate('/admin/dossiers');
                }
              }}
              className={`${buttonClass.danger} self-start`}
            >
              <Icon name="delete" size={18} />
              Supprimer
            </button>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** L'étape du dossier, que le client voit frappée sur son tampon. */
function StepPanel({ dossier, save }: { dossier: AdminDossier; save: Save }) {
  const [busy, setBusy] = useState<number | null>(null);

  const go = async (step: number) => {
    setBusy(step);
    await save(() => adminApi.updateDossier(dossier.id, { step }));
    setBusy(null);
  };

  return (
    <Panel title="Avancement" subtitle={`Étape actuelle depuis le ${formatLongDate(dossier.stepChangedAt)}. Le client la voit dans son espace.`}>
      <ol className="grid gap-2 sm:grid-cols-5">
        {dossier.steps.map((step) => {
          const current = step.number === dossier.step;
          const done = step.number < dossier.step;

          return (
            <li key={step.number}>
              <button
                type="button"
                aria-pressed={current}
                disabled={busy !== null}
                onClick={() => !current && go(step.number)}
                className={`flex h-full min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors sm:flex-col sm:items-start sm:gap-1.5 ${
                  current
                    ? 'border-secondary bg-secondary-fixed/40 text-primary'
                    : done
                      ? 'border-surface-container bg-surface-container-low text-primary hover:border-primary/25'
                      : 'border-surface-container bg-white text-on-surface-variant hover:border-primary/25'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    current ? 'bg-secondary text-white' : done ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {busy === step.number ? <ButtonSpinner /> : done ? <Icon name="check" size={16} /> : step.number}
                </span>
                <span className="leading-snug">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function ClientPanel({ dossier, save }: { dossier: AdminDossier; save: Save }) {
  const { client } = dossier;
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);

  const reinvite = async () => {
    setBusy(true);
    await save(async () => {
      const response = await adminApi.invite(dossier.id);
      setInvitation(response.data ?? null);

      return { message: response.message };
    });
    setBusy(false);
  };

  return (
    <Panel title="Client">
      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-xs text-on-surface-variant">Email</dt>
          <dd className="break-all font-semibold text-primary">
            <a href={`mailto:${client.email}`} className="hover:underline">
              {client.email}
            </a>
          </dd>
        </div>
        {client.phone && (
          <div>
            <dt className="text-xs text-on-surface-variant">Téléphone</dt>
            <dd className="font-semibold text-primary">{client.phone}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-on-surface-variant">Espace client</dt>
          <dd className="font-semibold text-primary">
            {client.active
              ? client.lastLoginAt
                ? `Activé · dernière connexion le ${formatDate(client.lastLoginAt)}`
                : 'Activé'
              : client.invitationExpiresAt
                ? `Invitation en attente, valable jusqu'au ${formatDate(client.invitationExpiresAt)}`
                : 'Invitation expirée'}
          </dd>
        </div>
      </dl>

      {!client.active && !invitation && (
        <button type="button" onClick={reinvite} disabled={busy} className={`${buttonClass.secondary} self-start`}>
          {busy ? <ButtonSpinner /> : <Icon name="mail" size={18} />}
          Renvoyer l'invitation
        </button>
      )}

      {invitation && <InvitationLink invitation={invitation} clientName={client.fullName} phone={client.phone} />}

      <div className="flex flex-col gap-2 border-t border-surface-container pt-4">
        <p className="text-sm font-bold text-primary">Informations du client</p>
        {client.profile.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Pas encore renseignées : le client les donne à sa première connexion.</p>
        ) : (
          <dl className="flex flex-col gap-2 text-sm">
            {client.profile.map((row) => (
              <div key={row.label} className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">{row.label}</dt>
                <dd className="text-right font-semibold text-primary">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Panel>
  );
}

function NotePanel({ dossier, save }: { dossier: AdminDossier; save: Save }) {
  const [note, setNote] = useState(dossier.note);
  const [busy, setBusy] = useState(false);
  const changed = note !== dossier.note;

  return (
    <Panel title="Note interne" subtitle="Jamais visible par le client.">
      <label htmlFor="note-dossier" className="sr-only">
        Note interne
      </label>
      <textarea id="note-dossier" rows={4} maxLength={5000} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
      <button
        type="button"
        disabled={!changed || busy}
        onClick={async () => {
          setBusy(true);
          await save(() => adminApi.updateDossier(dossier.id, { note }));
          setBusy(false);
        }}
        className={`${buttonClass.primary} self-start`}
      >
        {busy && <ButtonSpinner />}
        Enregistrer la note
      </button>
    </Panel>
  );
}
