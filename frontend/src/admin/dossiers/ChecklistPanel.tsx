import { useState, type FormEvent } from 'react';
import Icon from '../../components/ui/Icon';
import { ITEM_STATUS } from '../../dossiers/status';
import type { ChecklistItem } from '../../dossiers/types';
import { formatBytes, formatDate } from '../../lib/format';
import { adminApi, adminDocumentUrl } from '../api';
import type { AdminDossier } from '../types';
import { ButtonSpinner, buttonClass, inputClass, Panel } from '../ui';

/**
 * Lance une modification du dossier et remplace la fiche par la réponse.
 * Rend false en cas d'échec (le message est affiché par la page).
 */
export type Save = (action: () => Promise<{ data?: AdminDossier; message?: string }>) => Promise<boolean>;

/**
 * Pièces à fournir : vérifier ce que le client a déposé (valider, ou
 * refuser avec un motif qu'il lira), et ajuster la liste du dossier.
 */
export default function ChecklistPanel({ dossier, save }: { dossier: AdminDossier; save: Save }) {
  const items = dossier.checklist;
  const toReview = items.filter((item) => item.status === 'received').length;

  const move = (index: number, offset: number) => {
    const ids = items.map((item) => item.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];

    return save(() => adminApi.reorderItems(dossier.id, ids));
  };

  return (
    <Panel
      title="Pièces à fournir"
      subtitle={
        toReview > 0
          ? `${toReview} pièce${toReview > 1 ? 's' : ''} déposée${toReview > 1 ? 's' : ''} à vérifier.`
          : 'Le client dépose ses fichiers pièce par pièce ; vous les validez ou les refusez.'
      }
    >
      <ul className="flex flex-col gap-3">
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            save={save}
            onUp={index > 0 ? () => move(index, -1) : undefined}
            onDown={index < items.length - 1 ? () => move(index, 1) : undefined}
          />
        ))}
      </ul>

      <AddItem dossierId={dossier.id} save={save} />
    </Panel>
  );
}

function ItemRow({ item, save, onUp, onDown }: { item: ChecklistItem; save: Save; onUp?: () => void; onDown?: () => void }) {
  const [mode, setMode] = useState<'view' | 'reject' | 'edit'>('view');
  const [reason, setReason] = useState('');
  const [label, setLabel] = useState(item.label);
  const [help, setHelp] = useState(item.help);
  const [required, setRequired] = useState(item.required);
  const [busy, setBusy] = useState(false);
  const meta = ITEM_STATUS[item.status];

  const run = async (action: () => Promise<{ data?: AdminDossier }>) => {
    setBusy(true);
    const ok = await save(action);
    setBusy(false);

    if (ok) {
      setMode('view');
      setReason('');
    }
  };

  const reviewable = item.documents.length > 0;

  return (
    <li className={`flex flex-col gap-3 rounded-xl border p-4 ${item.status === 'received' ? 'border-secondary/40 bg-secondary-fixed/20' : 'border-surface-container'}`}>
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-bold text-primary">
            {item.label}
            {!item.required && <span className="ml-2 text-xs font-medium text-on-surface-variant">Facultative</span>}
          </p>
          {item.help && <p className="text-xs leading-relaxed text-on-surface-variant">{item.help}</p>}
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.chip}`}>
          <Icon name={meta.icon} size={14} filled={item.status === 'validated'} />
          {meta.label}
        </span>
      </div>

      {item.status === 'rejected' && item.rejectionReason && (
        <p className="rounded-lg bg-brand-red-soft px-3 py-2 text-xs text-brand-red-ink">
          <span className="font-bold">Motif donné au client : </span>
          {item.rejectionReason}
        </p>
      )}

      {item.documents.length > 0 && (
        <ul className="flex flex-col gap-1">
          {item.documents.map((file) => (
            <li key={file.id} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1">
              <Icon name="description" size={18} className="shrink-0 text-on-surface-variant" />
              <a
                href={adminDocumentUrl(file.id)}
                target="_blank"
                rel="noopener"
                className="min-w-0 flex-1 truncate text-sm font-semibold text-primary underline-offset-2 hover:underline"
              >
                {file.name}
              </a>
              <span className="hidden shrink-0 text-xs text-on-surface-variant sm:inline">
                {formatBytes(file.size)} · {formatDate(file.createdAt)}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => window.confirm(`Supprimer « ${file.name} » ? Le client devra le déposer de nouveau.`) && run(() => adminApi.deleteDocument(file.id))}
                aria-label={`Supprimer ${file.name}`}
                className={buttonClass.icon}
              >
                <Icon name="delete" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {mode === 'reject' && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => adminApi.updateItem(item.id, { status: 'rejected', rejection_reason: reason }));
          }}
        >
          <label htmlFor={`motif-${item.id}`} className="text-sm font-semibold text-primary">
            Ce qui ne va pas (le client le lira)
          </label>
          <textarea
            id={`motif-${item.id}`}
            rows={2}
            maxLength={300}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex. : la photo est floue, reprenez-la à la lumière du jour."
            className={inputClass}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || !reason.trim()} className={buttonClass.danger}>
              {busy && <ButtonSpinner />}
              Refuser la pièce
            </button>
            <button type="button" onClick={() => setMode('view')} className={buttonClass.secondary}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {mode === 'edit' && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => adminApi.updateItem(item.id, { label, help, required }));
          }}
        >
          <input aria-label="Intitulé de la pièce" value={label} maxLength={160} onChange={(event) => setLabel(event.target.value)} className={inputClass} />
          <input aria-label="Précision pour le client" value={help} maxLength={300} onChange={(event) => setHelp(event.target.value)} placeholder="Précision pour le client" className={inputClass} />
          <label className="flex min-h-11 items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} className="h-4 w-4 accent-secondary" />
            Pièce obligatoire
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || !label.trim()} className={buttonClass.primary}>
              Enregistrer
            </button>
            <button type="button" onClick={() => setMode('view')} className={buttonClass.secondary}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {mode === 'view' && (
        <div className="flex flex-wrap items-center gap-2">
          {reviewable && item.status !== 'validated' && (
            <button type="button" disabled={busy} onClick={() => run(() => adminApi.updateItem(item.id, { status: 'validated' }))} className={buttonClass.primary}>
              <Icon name="check" size={18} />
              Valider
            </button>
          )}
          {reviewable && item.status !== 'rejected' && (
            <button type="button" disabled={busy} onClick={() => setMode('reject')} className={buttonClass.secondary}>
              Refuser
            </button>
          )}
          {item.status === 'validated' && (
            <button type="button" disabled={busy} onClick={() => run(() => adminApi.updateItem(item.id, { status: 'received' }))} className={buttonClass.secondary}>
              Annuler la validation
            </button>
          )}

          <span className="ml-auto flex items-center">
            <button type="button" onClick={onUp} disabled={!onUp || busy} aria-label={`Monter « ${item.label} »`} className={buttonClass.icon}>
              <Icon name="arrow_upward" size={18} />
            </button>
            <button type="button" onClick={onDown} disabled={!onDown || busy} aria-label={`Descendre « ${item.label} »`} className={buttonClass.icon}>
              <Icon name="arrow_downward" size={18} />
            </button>
            <button type="button" onClick={() => setMode('edit')} aria-label={`Modifier « ${item.label} »`} className={buttonClass.icon}>
              <Icon name="edit" size={18} />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                window.confirm(
                  item.documents.length > 0
                    ? `Retirer « ${item.label} » de la liste ? Les ${item.documents.length} fichier(s) déposé(s) seront supprimés.`
                    : `Retirer « ${item.label} » de la liste ?`,
                ) && run(() => adminApi.deleteItem(item.id))
              }
              aria-label={`Retirer « ${item.label} »`}
              className={buttonClass.icon}
            >
              <Icon name="delete" size={18} />
            </button>
          </span>
        </div>
      )}
    </li>
  );
}

function AddItem({ dossierId, save }: { dossierId: string; save: Save }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [help, setHelp] = useState('');
  const [required, setRequired] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);

    if (await save(() => adminApi.addItem(dossierId, { label, help, required }))) {
      setLabel('');
      setHelp('');
      setRequired(true);
      setOpen(false);
    }

    setBusy(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${buttonClass.secondary} self-start`}>
        <Icon name="add" size={18} />
        Ajouter une pièce
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-dashed border-surface-container-high p-4">
      <label htmlFor="piece-label" className="text-sm font-semibold text-primary">
        Nouvelle pièce
      </label>
      <input id="piece-label" value={label} maxLength={160} required onChange={(event) => setLabel(event.target.value)} placeholder="Ex. : Lettre d'admission" className={inputClass} />
      <input aria-label="Précision pour le client" value={help} maxLength={300} onChange={(event) => setHelp(event.target.value)} placeholder="Précision pour le client (facultatif)" className={inputClass} />
      <label className="flex min-h-11 items-center gap-2 text-sm text-on-surface">
        <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} className="h-4 w-4 accent-secondary" />
        Pièce obligatoire
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !label.trim()} className={buttonClass.primary}>
          {busy && <ButtonSpinner />}
          Ajouter
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass.secondary}>
          Annuler
        </button>
      </div>
    </form>
  );
}
