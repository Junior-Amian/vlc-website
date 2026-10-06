import { useEffect, useId, useState } from 'react';
import Icon from '../../components/ui/Icon';
import { ApiError } from '../../lib/api';
import { adminApi } from '../api';
import { ImageError, resizeImage, toUploadForm } from '../lib/resizeImage';
import type { MediaItem } from '../types';
import { ButtonSpinner, buttonClass, inputClass, Notice } from '../ui';

type Step = 'idle' | 'preparing' | 'sending';

/**
 * Ajout d'une image : choix du fichier, aperçu, description, puis envoi.
 *
 * La description (texte alternatif) est demandée à chaque envoi : c'est ce
 * que lisent les personnes malvoyantes et les moteurs de recherche.
 *
 * Pas de <form> ici : le composant s'affiche aussi dans le choix d'image
 * d'une section, donc à l'intérieur du formulaire de celle-ci. Un
 * formulaire imbriqué est invalide, et son bouton enregistrait la section.
 */
export default function MediaUploader({ onUploaded }: { onUploaded: (item: MediaItem) => void }) {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setFile(null);
    setAlt('');
    setStep('idle');
  };

  const submit = async () => {
    if (!file) {
      return;
    }

    if (alt.trim() === '') {
      setError('Décrivez la photo en quelques mots avant de l\'envoyer.');
      return;
    }

    setError(null);

    try {
      setStep('preparing');
      const resized = await resizeImage(file);

      setStep('sending');
      const response = await adminApi.uploadMedia(toUploadForm(file, resized, alt.trim()));

      if (response.data) {
        onUploaded(response.data);
      }

      reset();
    } catch (caught) {
      setStep('idle');

      if (caught instanceof ApiError) {
        setError(Object.values(caught.errors).flat()[0] ?? caught.message);
      } else if (caught instanceof ImageError) {
        setError(caught.message);
      } else {
        setError("L'image n'a pas pu être envoyée. Réessayez.");
      }
    }
  };

  const busy = step !== 'idle';

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Notice tone="error" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}

      {!file ? (
        <label
          htmlFor={`${id}-fichier`}
          className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-surface-container-high bg-surface-container-low px-6 py-8 text-center transition-colors hover:border-secondary/50 hover:bg-white has-[:focus-visible]:border-secondary"
        >
          <Icon name="upload" size={28} className="text-secondary" />
          <span className="text-sm font-semibold text-primary">Choisir une photo</span>
          <span className="text-xs text-on-surface-variant">
            JPEG, PNG ou WebP. Elle sera redimensionnée avant l'envoi.
          </span>
          <input
            id={`${id}-fichier`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {preview && (
            <img
              src={preview}
              alt=""
              className="h-36 w-full shrink-0 rounded-xl bg-surface-container object-contain sm:w-48"
            />
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="truncate text-sm text-on-surface-variant">{file.name}</p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-alt`} className="text-sm font-semibold text-primary">
                Description de la photo
              </label>
              <input
                id={`${id}-alt`}
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                onKeyDown={(event) => {
                  // Entrée envoie l'image, et non le formulaire de section autour.
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submit();
                  }
                }}
                maxLength={200}
                aria-required="true"
                placeholder="Ex. : Marc-Peniel et Marie-Paule dans leur bureau d'Abidjan"
                aria-describedby={`${id}-alt-aide`}
                className={inputClass}
              />
              <p id={`${id}-alt-aide`} className="text-xs leading-relaxed text-on-surface-variant">
                Lue aux personnes malvoyantes et par Google. Décrivez ce que l'on voit, en une phrase.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={submit} disabled={busy} className={buttonClass.primary}>
                {busy ? (
                  <>
                    <ButtonSpinner />
                    {step === 'preparing' ? 'Préparation…' : 'Envoi…'}
                  </>
                ) : (
                  <>
                    <Icon name="upload" size={18} />
                    Envoyer
                  </>
                )}
              </button>
              <button type="button" onClick={reset} disabled={busy} className={buttonClass.secondary}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
