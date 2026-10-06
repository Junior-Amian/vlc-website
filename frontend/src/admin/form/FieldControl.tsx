import Icon from '../../components/ui/Icon';
import type { FieldDef } from '../types';
import { describedBy, FieldShell, inputClass } from '../ui';
import { useFormContext } from './FormContext';
import ImageField from './ImageField';
import ItemsField from './ItemsField';
import ListField from './ListField';

type Props = {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Chemin pointé du champ (« items.2.title ») : identifiant et clé des erreurs. */
  path: string;
};

/** Identifiant HTML d'un chemin de champ. */
export function fieldId(path: string): string {
  return `champ-${path.replace(/\./g, '-')}`;
}

/** Aiguillage d'un champ du schéma vers son contrôle. */
export default function FieldControl({ field, value, onChange, path }: Props) {
  switch (field.type) {
    case 'items':
      return <ItemsField field={field} value={value} onChange={onChange} path={path} />;
    case 'list':
      return <ListField field={field} value={value} onChange={onChange} path={path} />;
    case 'image':
      return <ImageField field={field} value={value} onChange={onChange} path={path} />;
    case 'boolean':
      return <BooleanField field={field} value={value} onChange={onChange} path={path} />;
    case 'icon':
      return <IconField field={field} value={value} onChange={onChange} path={path} />;
    case 'select':
      return <SelectField field={field} value={value} onChange={onChange} path={path} />;
    default:
      return <TextField field={field} value={value} onChange={onChange} path={path} />;
  }
}

function TextField({ field, value, onChange, path }: Props) {
  const { errors } = useFormContext();
  const id = fieldId(path);
  const text = typeof value === 'string' ? value : '';
  const fieldErrors = errors[path];

  const common = {
    id,
    value: text,
    'aria-invalid': fieldErrors ? true : undefined,
    'aria-describedby': describedBy(id, field.help, fieldErrors),
    className: inputClass,
  };

  const update = (next: string) => onChange(field.uppercase ? next.toUpperCase() : next);

  return (
    <FieldShell
      id={id}
      label={field.label}
      required={field.required}
      help={field.help}
      errors={fieldErrors}
      counter={field.max && field.max > 3 ? { length: text.length, max: field.max } : undefined}
    >
      {field.type === 'text' ? (
        <textarea
          {...common}
          rows={Math.min(8, Math.max(3, Math.ceil(text.length / 70)))}
          onChange={(event) => update(event.target.value)}
          className={`${inputClass} resize-y leading-relaxed`}
        />
      ) : (
        <input
          {...common}
          type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
          inputMode={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : undefined}
          autoCapitalize={field.uppercase ? 'characters' : field.type === 'slug' ? 'none' : undefined}
          spellCheck={field.type === 'slug' || field.type === 'url' || field.type === 'email' ? false : undefined}
          onChange={(event) => update(event.target.value)}
          className={`${inputClass} ${field.uppercase ? 'uppercase' : ''}`}
        />
      )}
    </FieldShell>
  );
}

function SelectField({ field, value, onChange, path }: Props) {
  const { errors, options } = useFormContext();
  const id = fieldId(path);
  const choices = field.optionsFrom ? (options[field.optionsFrom] ?? []) : (field.options ?? []);
  const current = typeof value === 'string' ? value : '';
  const fieldErrors = errors[path];

  return (
    <FieldShell id={id} label={field.label} required={field.required} help={field.help} errors={fieldErrors}>
      <select
        id={id}
        value={current}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={fieldErrors ? true : undefined}
        aria-describedby={describedBy(id, field.help, fieldErrors)}
        className={inputClass}
      >
        <option value="" disabled>
          Choisir…
        </option>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
        {/* Valeur enregistrée qui n'existe plus (prestation supprimée depuis). */}
        {current !== '' && !choices.some((choice) => choice.value === current) && (
          <option value={current}>{current} (n'existe plus)</option>
        )}
      </select>
    </FieldShell>
  );
}

function BooleanField({ field, value, onChange, path }: Props) {
  const id = fieldId(path);
  const checked = value !== false;

  return (
    <label htmlFor={id} className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm font-semibold text-primary">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      {/* Interrupteur : le focus clavier se voit sur la piste. */}
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-surface-container-high transition-colors peer-checked:bg-brand-green peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
      {field.label}
    </label>
  );
}

function IconField({ field, value, onChange, path }: Props) {
  const { errors, icons } = useFormContext();
  const id = fieldId(path);
  const fieldErrors = errors[path];

  // De vrais boutons radio, masqués : le clavier (flèches) et les lecteurs
  // d'écran les gèrent nativement ; seule la pastille est dessinée.
  return (
    <fieldset id={id} className="flex flex-col gap-1.5" aria-describedby={describedBy(id, field.help, fieldErrors)}>
      <legend className="mb-1.5 text-sm font-semibold text-primary">{field.label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {icons.map((icon) => (
          <label key={icon} title={icon.replace(/_/g, ' ')} className="cursor-pointer">
            <input
              type="radio"
              name={id}
              value={icon}
              checked={value === icon}
              onChange={() => onChange(icon)}
              className="peer sr-only"
            />
            <span className="sr-only">{icon.replace(/_/g, ' ')}</span>
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-surface-container-high bg-white text-primary transition-colors hover:border-primary/30 peer-checked:border-secondary peer-checked:bg-secondary-fixed peer-checked:text-on-secondary-fixed peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary"
            >
              <Icon name={icon} size={22} />
            </span>
          </label>
        ))}
      </div>
      {fieldErrors?.map((error) => (
        <p key={error} id={`${id}-error`} className="text-sm font-medium text-brand-red-ink">
          {error}
        </p>
      ))}
    </fieldset>
  );
}
