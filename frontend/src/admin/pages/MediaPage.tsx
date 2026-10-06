import { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon';
import { imageProps } from '../../content/media';
import { adminApi, errorMessage } from '../api';
import MediaUploader from '../media/MediaUploader';
import type { MediaItem } from '../types';
import { formatBytes, formatDate } from '../../lib/format';
import { buttonClass, inputClass, Notice, PageHeader, Panel, Spinner } from '../ui';

function MediaCard({
  item,
  onChange,
  onDelete,
  onError,
}: {
  item: MediaItem;
  onChange: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onError: (caught: unknown) => void;
}) {
  const [alt, setAlt] = useState(item.alt);
  const [busy, setBusy] = useState(false);
  const used = item.usedIn.length > 0;

  const saveAlt = async () => {
    if (alt.trim() === item.alt) {
      return;
    }

    setBusy(true);

    try {
      const response = await adminApi.updateMedia(item.id, alt.trim());

      if (response.data) {
        onChange({ ...item, alt: response.data.alt });
      }
    } catch (caught) {
      onError(caught);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Supprimer définitivement cette image ?')) {
      return;
    }

    setBusy(true);

    try {
      await adminApi.deleteMedia(item.id);
      onDelete(item.id);
    } catch (caught) {
      onError(caught);
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-surface-container bg-white">
      <img
        {...imageProps(item, 480)}
        alt=""
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        loading="lazy"
        className="aspect-[4/3] w-full bg-surface-container object-cover"
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`alt-${item.id}`} className="text-xs font-semibold text-primary">
            Description
          </label>
          <input
            id={`alt-${item.id}`}
            value={alt}
            maxLength={200}
            onChange={(event) => setAlt(event.target.value)}
            onBlur={saveAlt}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            disabled={busy}
            className={inputClass}
          />
        </div>

        <p className="text-xs leading-relaxed text-on-surface-variant">
          {item.width} × {item.height} px, {formatBytes(item.size)}
          <br />
          Ajoutée le {formatDate(item.createdAt)}
        </p>

        {used ? (
          <ul aria-label="Utilisée dans" className="flex flex-wrap gap-1.5">
            {item.usedIn.map((label) => (
              <li key={label} className="inline-flex items-center gap-1 rounded-full bg-brand-green-soft px-2.5 py-1 text-xs font-semibold text-brand-green">
                <Icon name="check" size={14} />
                {label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-on-surface-variant">Utilisée nulle part</p>
        )}

        <button
          type="button"
          onClick={remove}
          disabled={busy || used}
          title={used ? 'Retirez-la d\'abord des sections qui l\'affichent.' : undefined}
          className={`${buttonClass.danger} mt-auto w-full`}
        >
          <Icon name="delete" size={18} />
          Supprimer
        </button>
      </div>
    </li>
  );
}

/** Médiathèque : ajout, description et suppression des images. */
export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleError = (caught: unknown) => setError(errorMessage(caught, 'Opération impossible pour le moment.'));

  useEffect(() => {
    adminApi
      .media()
      .then((response) => setItems(response.data ?? []))
      .catch(handleError);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        trail="Réglages"
        title="Médiathèque"
        description="Les photos se choisissent ensuite dans chaque section : bannière, portrait du couple, témoignages. Une photo encore affichée sur le site ne peut pas être supprimée."
        actions={
          items !== null && (
            <p className="text-sm text-on-surface-variant">
              {items.length} image{items.length > 1 ? 's' : ''}, {formatBytes(items.reduce((sum, item) => sum + item.size, 0))}
            </p>
          )
        }
      />

      <Panel title="Ajouter une image">
        <MediaUploader
          onUploaded={(item) => setItems((current) => [item, ...(current ?? [])])}
        />
      </Panel>

      {error && (
        <Notice tone="error" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}

      {items === null && !error && <Spinner />}

      {items !== null && items.length === 0 && (
        <p className="text-sm text-on-surface-variant">Aucune image pour l'instant.</p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onError={handleError}
              onChange={(next) => setItems((current) => current?.map((candidate) => (candidate.id === next.id ? next : candidate)) ?? null)}
              onDelete={(id) => setItems((current) => current?.filter((candidate) => candidate.id !== id) ?? null)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
