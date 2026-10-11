import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { buttonClass, Notice } from '../../components/ui/controls';
import { ApiError } from '../../lib/api';
import { formatBytes, formatLongDate } from '../../lib/format';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { clientApi, documentUrl, uploadDocument } from '../api';
import { useClient } from '../ClientContext';
import { checklistProgress, itemsToDo } from '../../dossiers/status';
import type { ChecklistItem, DocumentFile } from '../../dossiers/types';
import { Card, PageTitle, ProgressBar, StatusChip } from '../ui';

/** Types que le navigateur affiche lui-même (DocumentStore::VIEWABLE côté API). */
const VIEWABLE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * Grille des pièces, sous xl. Les fiches d'une même rangée s'alignent en
 * hauteur : côte à côte, des fiches de tailles différentes donnaient un bas
 * en escalier.
 */
const CARD_GRID = 'grid gap-3 lg:grid-cols-2 lg:gap-4';

/**
 * Les pièces du dossier, en deux groupes : ce qui reste à faire, puis ce
 * qui est envoyé. Chaque pièce porte son état en clair, et son motif quand
 * elle est à refaire.
 *
 * Deux présentations (refonte du 10/10/2026) :
 * - jusqu'à xl, des fiches empilées (deux par rangée à partir de lg), chacune
 *   avec son bouton d'envoi ;
 * - à partir de xl, la liste des pièces à gauche et la pièce choisie à
 *   droite, avec une zone où glisser-déposer les fichiers.
 *
 * `?piece=` (lien depuis la page Suivi) choisit la pièce ; au téléphone, la
 * page défile jusqu'à elle.
 */
export default function DocumentsPage() {
  const { dossier, maxUploadBytes } = useClient();
  const [announcement, setAnnouncement] = useState('');
  const [params, setParams] = useSearchParams();
  const wide = useMediaQuery('(min-width: 1280px)');

  /*
    Groupes figés à l'ouverture de la page : une pièce envoyée reste à sa
    place (son état change sous les yeux du client) au lieu de sauter dans
    l'autre groupe, ce qui interromprait aussi un envoi de plusieurs
    fichiers. Le classement se refait à la prochaine visite.
  */
  const [toDoIds] = useState(
    () => new Set(dossier?.checklist.filter((item) => item.status === 'missing' || item.status === 'rejected').map((item) => item.id)),
  );

  const requested = params.get('piece');

  // Au téléphone, la pièce demandée est amenée à l'écran. Après coup :
  // la coquille remonte d'abord en haut de page à chaque changement de rubrique.
  useEffect(() => {
    if (wide || !requested) {
      return;
    }

    const frame = requestAnimationFrame(() => document.getElementById(`piece-${requested}`)?.scrollIntoView({ block: 'start' }));

    return () => cancelAnimationFrame(frame);
  }, [wide, requested]);

  if (!dossier) {
    return <PageTitle title="Vos documents">Votre dossier n'est pas encore disponible.</PageTitle>;
  }

  const toDo = dossier.checklist.filter((item) => toDoIds.has(item.id));
  const sent = dossier.checklist.filter((item) => !toDoIds.has(item.id));
  // Même décompte que l'onglet : les pièces facultatives n'y entrent pas.
  const remaining = itemsToDo(dossier).length;
  const selected =
    dossier.checklist.find((item) => item.id === requested) ?? toDo[0] ?? dossier.checklist[0] ?? null;

  const allSent =
    toDo.length === 0 ? (
      <Card className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-green-soft text-brand-green">
          <Icon name="check_circle" size={24} filled />
        </span>
        <p className="text-[0.9375rem] leading-relaxed text-on-surface">
          Toutes les pièces demandées sont envoyées. Votre conseiller vous dira s'il lui manque quelque chose.
        </p>
      </Card>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Vos documents">
        Une photo nette ou un PDF, pour chaque pièce. {formatBytes(maxUploadBytes)} au maximum par fichier.
      </PageTitle>

      {/* Annonce les envois et suppressions aux lecteurs d'écran. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {wide ? (
        <>
          {allSent}
          <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <PieceList
              toDo={toDo}
              sent={sent}
              remaining={remaining}
              selectedId={selected?.id ?? null}
              onSelect={(id) => setParams({ piece: id }, { replace: true })}
              progress={checklistProgress(dossier)}
            />
            {selected && (
              <ItemCard
                key={selected.id}
                item={selected}
                maxBytes={maxUploadBytes}
                onAnnounce={setAnnouncement}
                detail
              />
            )}
          </div>
        </>
      ) : (
        <>
          {toDo.length > 0 ? (
            <section aria-labelledby="docs-todo" className="flex flex-col gap-3">
              <h2 id="docs-todo" className="flex items-center gap-2 text-base font-bold text-primary">
                À fournir
                {remaining > 0 && <CountChip count={remaining} />}
              </h2>
              <div className={CARD_GRID}>
                {toDo.map((item) => (
                  <ItemCard key={item.id} item={item} maxBytes={maxUploadBytes} onAnnounce={setAnnouncement} />
                ))}
              </div>
            </section>
          ) : (
            allSent
          )}

          {sent.length > 0 && (
            <section aria-labelledby="docs-sent" className="flex flex-col gap-3">
              <h2 id="docs-sent" className="text-base font-bold text-primary">
                Envoyées
              </h2>
              <div className={CARD_GRID}>
                {sent.map((item) => (
                  <ItemCard key={item.id} item={item} maxBytes={maxUploadBytes} onAnnounce={setAnnouncement} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CountChip({ count }: { count: number }) {
  return <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-xs tabular-nums text-on-secondary-fixed">{count}</span>;
}

/**
 * Colonne de gauche, à partir de xl : l'avancement, puis les pièces en deux
 * groupes. Collée en haut de l'écran pendant que la fiche défile.
 */
function PieceList({
  toDo,
  sent,
  remaining,
  selectedId,
  onSelect,
  progress,
}: {
  toDo: ChecklistItem[];
  sent: ChecklistItem[];
  remaining: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  progress: { validated: number; required: number };
}) {
  return (
    <nav aria-label="Pièces du dossier" className="sticky top-10">
      {/* Même aspect qu'une Card, avec une marge intérieure plus serrée pour la liste. */}
      <div className="flex flex-col gap-5 rounded-3xl border border-surface-container bg-white p-3 shadow-ambient">
        <div className="flex flex-col gap-2 px-3 pt-3">
          <p className="flex items-baseline justify-between gap-3 text-sm text-on-surface-variant">
            Pièces validées
            <span className="font-bold tabular-nums text-primary">
              {progress.validated} / {progress.required}
            </span>
          </p>
          <ProgressBar value={progress.required > 0 ? progress.validated / progress.required : 0} label="Pièces obligatoires validées" tone="green" />
        </div>

        {toDo.length > 0 && (
          <PieceGroup title="À fournir" count={remaining} items={toDo} selectedId={selectedId} onSelect={onSelect} />
        )}
        {sent.length > 0 && <PieceGroup title="Envoyées" items={sent} selectedId={selectedId} onSelect={onSelect} />}
      </div>
    </nav>
  );
}

function PieceGroup({
  title,
  count,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  count?: number;
  items: ChecklistItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold text-on-surface-variant">
        {title}
        {count !== undefined && count > 0 && <CountChip count={count} />}
      </h2>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = item.id === selectedId;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={active ? 'true' : undefined}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-150 ${
                  active ? 'bg-secondary-fixed/50 ring-1 ring-secondary/30' : 'hover:bg-surface-container-low'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-primary">{item.label}</span>
                  <span className="block text-xs text-on-surface-variant">
                    {item.documents.length === 0
                      ? item.required
                        ? 'Aucun fichier'
                        : 'Facultatif'
                      : item.documents.length === 1
                        ? '1 fichier'
                        : `${item.documents.length} fichiers`}
                  </span>
                </span>
                <StatusChip status={item.status} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Upload = { index: number; count: number; name: string; progress: number; abort: () => void };

/**
 * Une pièce. En fiche (`detail` absent) : titre, état, fichiers et bouton
 * d'envoi. En détail (grand écran) : plus d'air, et une zone où déposer les
 * fichiers par glisser-déposer, en plus du bouton.
 */
function ItemCard({
  item,
  maxBytes,
  onAnnounce,
  detail = false,
}: {
  item: ChecklistItem;
  maxBytes: number;
  onAnnounce: (message: string) => void;
  detail?: boolean;
}) {
  const { update } = useClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Les événements de survol se déclenchent aussi sur les enfants de la
  // zone : on compte les entrées et sorties pour savoir quand elle est quittée.
  const dragDepth = useRef(0);
  const locked = item.status === 'validated';
  const Heading = detail ? 'h2' : 'h3';

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void send(files);
  }

  async function send(files: File[]) {
    setError(null);

    if (files.length === 0) {
      return;
    }

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

  const drop = {
    onDragEnter: (event: DragEvent) => {
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);

      if (dragDepth.current === 0) {
        setDragging(false);
      }
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      void send(Array.from(event.dataTransfer.files));
    },
  };

  const pickLabel =
    item.documents.length > 0 ? 'Ajouter un fichier' : item.status === 'rejected' ? 'Envoyer une nouvelle version' : 'Déposer le document';

  return (
    <Card
      id={`piece-${item.id}`}
      className={`flex scroll-mt-24 flex-col ${detail ? 'gap-6 lg:p-8' : 'gap-4'} ${item.status === 'rejected' ? 'border-brand-red/30' : ''}`}
    >
      {/*
        L'aide passe sous la ligne du titre et de l'état, sur toute la
        largeur : à côté de l'étiquette d'état, elle tenait dans une colonne
        étroite (sept lignes pour le passeport à 320 px).
      */}
      <div className={`flex flex-col ${detail ? 'gap-2' : 'gap-1'}`}>
        <div className="flex items-start justify-between gap-3">
          <Heading className={`min-w-0 font-bold leading-snug text-primary ${detail ? 'text-xl' : 'text-[0.9375rem] sm:text-base'}`}>
            {item.label}
            {!item.required && <span className="ml-2 text-xs font-medium text-on-surface-variant">Facultatif</span>}
          </Heading>
          <StatusChip status={item.status} />
        </div>
        {item.help && <p className={`leading-relaxed text-on-surface-variant ${detail ? 'max-w-[60ch] text-[0.9375rem]' : 'text-sm'}`}>{item.help}</p>}
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
        <div className="flex flex-col gap-2">
          {detail && (
            <h3 className="text-sm font-semibold text-primary">
              {item.documents.length > 1 ? `${item.documents.length} fichiers envoyés` : 'Fichier envoyé'}
            </h3>
          )}
          <ul className="flex flex-col divide-y divide-surface-container rounded-2xl border border-surface-container">
            {item.documents.map((file) => (
              <FileRow key={file.id} file={file} removable={!locked && !upload} onAnnounce={onAnnounce} />
            ))}
          </ul>
        </div>
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
          {/* 44 px de haut au doigt : c'est le seul moyen d'arrêter un envoi trop long. */}
          <button
            type="button"
            onClick={upload.abort}
            className="-my-2 inline-flex min-h-11 items-center self-start text-sm font-semibold text-on-surface-variant underline-offset-2 hover:underline"
          >
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
          <input ref={inputRef} type="file" multiple onChange={onPick} className="sr-only" tabIndex={-1} aria-hidden="true" />
          {detail ? (
            /*
              Zone de dépôt : un fichier glissé depuis l'ordinateur suffit.
              Le bouton reste le chemin principal (clavier, lecteurs d'écran) ;
              la zone n'est qu'un raccourci pour la souris.
            */
            <div
              {...drop}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 text-center transition-colors duration-150 ${
                item.documents.length > 0 ? 'py-6' : 'py-10'
              } ${dragging ? 'border-secondary bg-secondary-fixed/40' : 'border-outline/60 bg-surface-container-low'}`}
            >
              <span
                aria-hidden="true"
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-150 ${
                  dragging ? 'bg-secondary text-white' : 'bg-white text-secondary-ink shadow-ambient'
                }`}
              >
                <Icon name="cloud_upload" size={26} />
              </span>
              <p className="text-[0.9375rem] font-semibold text-primary">
                {dragging ? 'Déposez pour envoyer' : 'Glissez vos fichiers ici'}
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={item.documents.length > 0 ? buttonClass.secondary : buttonClass.primary}
              >
                <Icon name="upload" size={20} />
                {pickLabel}
              </button>
              <p className="text-xs text-on-surface-variant">
                Photo ou PDF · {formatBytes(maxBytes)} au maximum par fichier · plusieurs fichiers possibles
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`${item.documents.length > 0 ? buttonClass.secondary : buttonClass.primary} w-full sm:w-auto sm:self-start`}
            >
              <Icon name="upload" size={20} />
              {pickLabel}
            </button>
          )}
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
