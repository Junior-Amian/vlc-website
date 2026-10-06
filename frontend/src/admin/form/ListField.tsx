import Icon from '../../components/ui/Icon';
import type { FieldDef } from '../types';
import { buttonClass, inputClass } from '../ui';
import { fieldId } from './FieldControl';
import { useFormContext } from './FormContext';

type Props = {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  path: string;
};

/**
 * Liste de textes (destinations, paragraphes du récit) : une ligne par
 * élément, que l'on peut ajouter, déplacer ou retirer. Une ligne laissée
 * vide est ignorée à l'enregistrement.
 */
export default function ListField({ field, value, onChange, path }: Props) {
  const { errors } = useFormContext();
  const entries = Array.isArray(value) ? (value as string[]) : [];
  const id = fieldId(path);
  const max = field.maxItems ?? Infinity;
  const multiline = field.of === 'text';

  const update = (next: string[]) => onChange(next);

  const move = (index: number, offset: number) => {
    const next = [...entries];
    const [entry] = next.splice(index, 1);
    next.splice(index + offset, 0, entry);
    update(next);
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold text-primary">
        {field.label}
        {!field.required && <span className="font-normal text-on-surface-variant"> (facultatif)</span>}
      </legend>

      {field.help && <p className="-mt-1 text-xs leading-relaxed text-on-surface-variant">{field.help}</p>}

      <ol className="flex flex-col gap-2">
        {entries.map((entry, index) => {
          const entryPath = `${path}.${index}`;
          const entryErrors = errors[entryPath];
          const label = `${field.label}, élément ${index + 1}`;

          return (
            <li key={index} className="flex flex-col gap-1">
              <div className="flex items-start gap-1.5">
                {multiline ? (
                  <textarea
                    id={fieldId(entryPath)}
                    aria-label={label}
                    value={entry}
                    rows={Math.min(8, Math.max(3, Math.ceil(entry.length / 70)))}
                    onChange={(event) => update(entries.map((item, i) => (i === index ? event.target.value : item)))}
                    aria-invalid={entryErrors ? true : undefined}
                    className={`${inputClass} resize-y leading-relaxed`}
                  />
                ) : (
                  <input
                    id={fieldId(entryPath)}
                    aria-label={label}
                    value={entry}
                    onChange={(event) => update(entries.map((item, i) => (i === index ? event.target.value : item)))}
                    aria-invalid={entryErrors ? true : undefined}
                    className={inputClass}
                  />
                )}

                <div className={`flex shrink-0 ${multiline ? 'flex-col' : ''}`}>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Monter : ${label}`}
                    className={buttonClass.icon}
                  >
                    <Icon name="arrow_upward" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === entries.length - 1}
                    aria-label={`Descendre : ${label}`}
                    className={buttonClass.icon}
                  >
                    <Icon name="arrow_downward" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => update(entries.filter((_, i) => i !== index))}
                    aria-label={`Retirer : ${label}`}
                    className={`${buttonClass.icon} hover:bg-brand-red-soft! hover:text-brand-red-ink!`}
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </div>
              </div>

              {entryErrors?.map((error) => (
                <p key={error} className="text-sm font-medium text-brand-red-ink">
                  {error}
                </p>
              ))}
            </li>
          );
        })}
      </ol>

      {errors[path]?.map((error) => (
        <p key={error} id={`${id}-error`} className="text-sm font-medium text-brand-red-ink">
          {error}
        </p>
      ))}

      <button
        type="button"
        onClick={() => update([...entries, ''])}
        disabled={entries.length >= max}
        className={`${buttonClass.secondary} w-fit`}
      >
        <Icon name="add" size={18} />
        Ajouter
      </button>
    </fieldset>
  );
}
