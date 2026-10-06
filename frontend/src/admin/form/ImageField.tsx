import { useState } from 'react';
import Icon from '../../components/ui/Icon';
import { imageProps } from '../../content/media';
import MediaPicker from '../media/MediaPicker';
import type { FieldDef } from '../types';
import { buttonClass, describedBy } from '../ui';
import { fieldId } from './FieldControl';
import { useFormContext } from './FormContext';

type Props = {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  path: string;
};

/** Choix d'une image de la médiathèque ; la valeur est son identifiant. */
export default function ImageField({ field, value, onChange, path }: Props) {
  const { errors, media, rememberMedia } = useFormContext();
  const [picking, setPicking] = useState(false);
  const id = fieldId(path);
  // Identifiant UUID de l'image dans la médiathèque.
  const imageId = typeof value === 'string' && value !== '' ? value : null;
  const image = imageId !== null ? media[imageId] : undefined;
  const fieldErrors = errors[path];

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-libelle`} className="text-sm font-semibold text-primary">
        {field.label}
        {!field.required && <span className="font-normal text-on-surface-variant"> (facultatif)</span>}
      </span>

      <div
        id={id}
        role="group"
        aria-labelledby={`${id}-libelle`}
        aria-describedby={describedBy(id, field.help, fieldErrors)}
        className="flex flex-col gap-3 rounded-2xl border border-surface-container-high bg-surface-container-low p-3 sm:flex-row sm:items-center"
      >
        {image ? (
          <img
            {...imageProps(image, 480)}
            sizes="160px"
            className="h-28 w-full shrink-0 rounded-xl bg-surface-container object-cover sm:w-40"
          />
        ) : (
          <span className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-surface-container-high text-on-surface-variant/60 sm:w-40">
            <Icon name="image" size={32} />
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <p className="text-sm text-on-surface-variant">
            {image ? image.alt || 'Image sans description' : imageId !== null ? 'Image introuvable' : 'Aucune image choisie'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPicking(true)} className={buttonClass.secondary}>
              <Icon name="photo_library" size={18} />
              {imageId !== null ? 'Changer' : 'Choisir une image'}
            </button>
            {imageId !== null && (
              <button type="button" onClick={() => onChange(null)} className={buttonClass.secondary}>
                Retirer
              </button>
            )}
          </div>
        </div>
      </div>

      {field.help && (
        <p id={`${id}-help`} className="text-xs leading-relaxed text-on-surface-variant">
          {field.help}
        </p>
      )}

      {fieldErrors?.map((error) => (
        <p key={error} id={`${id}-error`} className="text-sm font-medium text-brand-red-ink">
          {error}
        </p>
      ))}

      <MediaPicker
        open={picking}
        title={field.label}
        selectedId={imageId}
        onClose={() => setPicking(false)}
        onSelect={(item) => {
          rememberMedia(item);
          onChange(item.id);
          setPicking(false);
        }}
      />
    </div>
  );
}
