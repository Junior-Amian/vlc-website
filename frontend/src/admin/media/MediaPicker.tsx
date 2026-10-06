import { useEffect, useId, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon';
import { imageProps } from '../../content/media';
import { adminApi, errorMessage } from '../api';
import type { MediaItem } from '../types';
import { buttonClass, Notice, Spinner } from '../ui';
import MediaUploader from './MediaUploader';

/**
 * Fenêtre de choix d'une image : la médiathèque, et de quoi en ajouter une.
 *
 * <dialog> natif : le focus y reste enfermé, Échap la ferme et le reste de
 * la page devient inerte, sans rien à programmer.
 */
export default function MediaPicker({
  open,
  title,
  selectedId,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  selectedId: string | null;
  onSelect: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);

    adminApi
      .media()
      .then((response) => setItems(response.data ?? []))
      .catch((caught) => setError(errorMessage(caught, 'La médiathèque est indisponible.')));
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(100vw-2rem,56rem)] overflow-hidden rounded-3xl bg-surface p-0 text-on-surface shadow-2xl backdrop:bg-primary/60"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-surface-container bg-white px-5 py-4">
          <h2 id={titleId} className="text-lg font-bold text-primary">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className={buttonClass.icon}>
            <Icon name="close" size={22} />
          </button>
        </header>

        <div className="flex flex-col gap-6 overflow-y-auto p-5">
          <section aria-label="Ajouter une image" className="rounded-2xl border border-surface-container bg-white p-4">
            <MediaUploader
              onUploaded={(item) => {
                setItems((current) => [item, ...(current ?? [])]);
                onSelect(item);
              }}
            />
          </section>

          {error && <Notice tone="error">{error}</Notice>}

          {items === null && !error && <Spinner />}

          {items !== null && items.length === 0 && (
            <p className="text-sm text-on-surface-variant">La médiathèque est vide : ajoutez une première image ci-dessus.</p>
          )}

          {items !== null && items.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => {
                const selected = item.id === selectedId;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      aria-pressed={selected}
                      className={`group flex w-full flex-col overflow-hidden rounded-xl border-2 bg-white text-left transition-colors ${
                        selected ? 'border-secondary' : 'border-transparent hover:border-primary/20'
                      }`}
                    >
                      <img
                        {...imageProps(item, 480)}
                        alt=""
                        sizes="200px"
                        loading="lazy"
                        className="aspect-[4/3] w-full bg-surface-container object-cover"
                      />
                      <span className="line-clamp-2 px-2.5 py-2 text-xs leading-snug text-on-surface-variant">
                        {item.alt || item.originalName}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
