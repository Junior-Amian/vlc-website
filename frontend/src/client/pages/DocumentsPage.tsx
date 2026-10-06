import { useRef, useState, type ChangeEvent } from 'react';
import Icon from '../../components/ui/Icon';
import { buttonClass, Notice } from '../../components/ui/controls';
import { ApiError } from '../../lib/api';
import { formatBytes, formatLongDate } from '../../lib/format';
import { clientApi, documentUrl, uploadDocument } from '../api';
import { useClient } from '../ClientContext';
import { itemsToDo } from '../../dossiers/status';
import type { ChecklistItem, DocumentFile } from '../../dossiers/types';
import { Card, PageTitle, ProgressBar, StatusChip } from '../ui';

/** Types que le navigateur affiche lui-même (DocumentStore::VIEWABLE côté API). */
const VIEWABLE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * Les pièces du dossier, en deux groupes : ce qui reste à faire, puis ce
 * qui est envoyé. Chaque pièce porte son état en clair, et son motif quand
 * elle est à refaire.
 */
export default function DocumentsPage() {
  const { dossier, maxUploadBytes } = useClient();
  const [announcement, setAnnouncement] = useState('');

  /*
    Groupes figés à l'ouverture de la page : une pièce envoyée reste à sa
    place (son état change sous les yeux du client) au lieu de sauter dans
    l'autre groupe, ce qui interromprait aussi un envoi de plusieurs
    fichiers. Le classement se refait à la prochaine visite.
  */
  const [toDoIds] = useState(
    () => new Set(dossier?.checklist.filter((item) => item.status === 'missing' || item.status === 'rejected').map((item) => item.id)),
  );

  if (!dossier) {
    return <PageTitle title="Vos documents">Votre dossier n'est pas encore disponible.</PageTitle>;
  }

  const toDo = dossier.checklist.filter((item) => toDoIds.has(item.id));
  const sent = dossier.checklist.filter((item) => !toDoIds.has(item.id));
  // Même décompte que l'onglet : les pièces facultatives n'y entrent pas.
  const remaining = itemsToDo(dossier).length;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Vos documents">
        Une photo nette ou un PDF, pour chaque pièce. {formatBytes(maxUploadBytes)} au maximum par fichier.
      </PageTitle>

      {/* Annonce les envois et suppressions aux lecteurs d'écran. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {toDo.length > 0 ? (
        <section aria-labelledby="docs-todo" className="flex flex-col gap-3">
          <h2 id="docs-todo" className="flex items-center gap-2 text-base font-bold text-primary">
            À fournir
            {remaining > 0 && (
              <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-xs tabular-nums text-secondary-ink">{remaining}</span>
            )}
          </h2>
          {toDo.map((item) => (
            <ItemCard key={item.id} item={item} maxBytes={maxUploadBytes} onAnnounce={setAnnouncement} />
          ))}
        </section>
      ) : (
        <Card className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-green-soft text-brand-green">
            <Icon name="check_circle" size={24} filled />
          </span>
          <p className="text-[0.9375rem] leading-relaxed text-on-surface">
            Toutes les pièces demandées sont envoyées. Votre conseiller vous dira s'il lui manque quelque chose.
          </p>
        </Card>
      )}

      {sent.length > 0 && (
        <section aria-labelledby="docs-sent" className="flex flex-col gap-3">
          <h2 id="docs-sent" className="text-base font-bold text-primary">
            Envoyées
          </h2>
          {sent.map((item) => (
            <ItemCard key={item.id} item={item} maxBytes={maxUploadBytes} onAnnounce={setAnnouncement} />
          ))}
        </section>
      )}
    </div>
  );
}

type Upload = { index: number; count: number; name: string; progress: number; abort: () => void };

function ItemCard({
  item,
  maxBytes,
  onAnnounce,
}: {
  item: ChecklistItem;
  maxBytes: number;
  onAnnounce: (message: string) => void;
}) {
  const { update } = useClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locked = item.status === 'validated';

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setError(null);

    const tooBig = files.find((file) => file.size > maxBytes);

    if (tooBig) {
      setError(
        `« ${tooBig.name} » pèse ${formatBytes(tooBig.size)} : ${formatBytes(maxBytes)} au maximum. Envoyez une photo plus légère ou un PDF compressé.`,
      );
      return;
    }

    // Un fichier après l'autre : sur un réseau mobile, deux envois
    // simultanés se ralentissent l'un l'autre.
    for (const [index, file] of files.entries()) {
      const { promise, abort } = uploadDocument(item.id, file, (progress) =>
        setUpload((current) => (current ? { ...current, progress } : current)),
      );
      setUpload({ index, count: files.length, name: file.name, progress: 0, abort });

      try {
        const response = await promise;

        if (response.data) {
          update(response.data);
        }

        onAnnounce(`${file.name} envoyé.`);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "L'envoi a échoué. Réessayez.");
        break;
      }
    }

    setUpload(null);
  }

  return (
    <Card className={`flex flex-col gap-4 ${item.status === 'rejected' ? 'border-brand-red/30' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-[0.9375rem] font-bold leading-snug text-primary sm:text-base">
            {item.label}
            {!item.required && <span className="ml-2 text-xs font-medium text-on-surface-variant">Facultatif</span>}
          </h3>
          {item.help && <p className="text-sm leading-relaxed text-on-surface-variant">{item.help}</p>}
        </div>
        <StatusChip status={item.status} />
      </div>

      {item.status === 'rejected' && item.rejectionReason && (
        <div className="flex items-start gap-3 rounded-2xl bg-brand-red-soft px-4 py-3 text-sm text-brand-red-ink">
          <Icon name="error" size={20} className="mt-px shrink-0" />
          <p className="leading-relaxed">
            <span className="font-bold">À corriger : </span>
            {item.rejectionReason}
          </p>
        </div>
      )}

      {item.documents.length > 0 && (
        <ul className="flex flex-col divide-y divide-surface-container rounded-2xl border border-surface-container">
          {item.documents.map((file) => (
            <FileRow key={file.id} file={file} removable={!locked && !upload} onAnnounce={onAnnounce} />
          ))}
        </ul>
      )}

      {upload && (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-container-low px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-primary">
              {upload.count > 1 ? `Envoi ${upload.index + 1} sur ${upload.count} · ` : 'Envoi · '}
              {upload.name}
            </span>
            <span className="shrink-0 tabular-nums text-on-surface-variant">{Math.round(upload.progress * 100)} %</span>
          </div>
          <ProgressBar value={upload.progress} label={`Envoi de ${upload.name}`} />
          <button type="button" onClick={upload.abort} className="self-start text-sm font-semibold text-on-surface-variant underline-offset-2 hover:underline">
            Annuler
          </button>
        </div>
      )}

      {error && (
        <Notice tone="error" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}

      {!locked && !upload && (
        <>
          <input ref={inputRef} type="file" multiple onChange={onFiles} className="sr-only" tabIndex={-1} aria-hidden="true" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`${item.documents.length > 0 ? buttonClass.secondary : buttonClass.primary} w-full sm:w-auto sm:self-start`}
          >
            <Icon name="upload" size={20} />
            {item.documents.length > 0 ? 'Ajouter un fichier' : item.status === 'rejected' ? 'Envoyer une nouvelle version' : 'Déposer le document'}
          </button>
        </>
      )}

      {locked && <p className="text-xs text-on-surface-variant">Pièce validée par votre conseiller : elle ne se modifie plus.</p>}
    </Card>
  );
}

function FileRow({ file, removable, onAnnounce }: { file: DocumentFile; removable: boolean; onAnnounce: (message: string) => void }) {
  const { update } = useClient();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewable = VIEWABLE.includes(file.mime);

  async function remove() {
    setBusy(true);
    setError(null);

    try {
      const response = await clientApi.deleteDocument(file.id);

      if (response.data) {
        update(response.data);
      }

      onAnnounce(`${file.name} retiré.`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Suppression impossible pour le moment.');
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 px-3 py-2.5 sm:px-4">
      <div className="flex items-center gap-3">
        <Icon name="description" size={22} className="shrink-0 text-on-surface-variant" />
        <a
          href={documentUrl(file.id)}
          target={viewable ? '_blank' : undefined}
          rel={viewable ? 'noopener' : undefined}
          download={viewable ? undefined : file.name}
          className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg"
        >
          <span className="truncate text-sm font-semibold text-primary underline-offset-2 hover:underline">{file.name}</span>
          <span className="text-xs text-on-surface-variant">
            {formatBytes(file.size)} · {formatLongDate(file.createdAt)}
          </span>
        </a>
        {removable && !confirming && (
          <button type="button" onClick={() => setConfirming(true)} aria-label={`Retirer ${file.name}`} className={buttonClass.icon}>
            <Icon name="delete" size={20} />
          </button>
        )}
      </div>

      {confirming && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-sm text-on-surface">Retirer ce fichier ?</span>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={buttonClass.secondary}>
            Annuler
          </button>
          <button type="button" onClick={remove} disabled={busy} className={buttonClass.danger}>
            Retirer
          </button>
        </div>
      )}

      {error && <p className="text-sm font-medium text-brand-red-ink">{error}</p>}
    </li>
  );
}
