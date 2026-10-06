import { describedBy, FieldShell, inputClass } from '../components/ui/controls';
import type { OnboardingField } from './types';

/** Date du jour au format AAAA-MM-JJ, borne haute des dates de naissance. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Les questions d'ouverture de dossier, telles que l'API les décrit
 * (api/app/Dossiers/Onboarding.php) : changer une question côté PHP la
 * change ici, sans toucher au front.
 *
 * Une liste courte (quatre choix au plus) devient des boutons à cocher, plus
 * simples au doigt qu'une liste déroulante.
 */
export default function OnboardingFields({
  fields,
  values,
  errors,
  onChange,
}: {
  fields: OnboardingField[];
  values: Record<string, string>;
  errors: Record<string, string[]>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {fields.map((field) => {
        const id = `onboarding-${field.key}`;
        const value = values[field.key] ?? '';
        const fieldErrors = errors[field.key];
        const common = {
          id,
          'aria-invalid': Boolean(fieldErrors),
          'aria-describedby': describedBy(id, field.help, fieldErrors),
          'aria-required': field.required,
        };

        if (field.type === 'select' && field.options && field.options.length <= 4) {
          return (
            <fieldset key={field.key} className="flex flex-col gap-1.5" aria-describedby={describedBy(id, undefined, fieldErrors)}>
              <legend className="mb-1.5 text-sm font-semibold text-primary">
                {field.label}
                {!field.required && <span className="font-normal text-on-surface-variant"> (facultatif)</span>}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {field.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-surface-container-high bg-white px-3.5 text-sm font-medium text-on-surface transition-colors has-[:checked]:border-secondary has-[:checked]:bg-secondary-fixed/40 has-[:checked]:text-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary"
                  >
                    <input
                      type="radio"
                      name={field.key}
                      value={option.value}
                      checked={value === option.value}
                      onChange={() => onChange(field.key, option.value)}
                      className="h-4 w-4 shrink-0 accent-secondary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {fieldErrors && (
                <p id={`${id}-error`} className="text-sm font-medium text-brand-red-ink">
                  {fieldErrors[0]}
                </p>
              )}
            </fieldset>
          );
        }

        return (
          <FieldShell key={field.key} id={id} label={field.label} required={field.required} help={field.help} errors={fieldErrors}>
            {field.type === 'select' ? (
              <select {...common} value={value} onChange={(event) => onChange(field.key, event.target.value)} className={inputClass}>
                <option value="">Choisir…</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...common}
                type={field.type === 'date' ? 'date' : 'text'}
                max={field.type === 'date' ? today() : undefined}
                maxLength={field.max}
                autoComplete={field.autocomplete ?? 'off'}
                autoCapitalize={field.uppercase ? 'characters' : undefined}
                value={value}
                onChange={(event) => onChange(field.key, event.target.value)}
                className={`${inputClass} ${field.uppercase ? 'uppercase' : ''}`}
              />
            )}
          </FieldShell>
        );
      })}
    </div>
  );
}

/**
 * Amène le curseur sur le premier champ en erreur, dans l'ordre du
 * formulaire : au téléphone, le message serait sinon hors de l'écran.
 */
export function focusFirstError(fields: OnboardingField[], errors: Record<string, string[]>): void {
  const first = fields.find((field) => errors[field.key]);

  if (first) {
    // Un bouton à cocher porte le nom du champ ; les autres, son identifiant.
    const target =
      document.getElementById(`onboarding-${first.key}`) ?? document.querySelector<HTMLInputElement>(`input[name="${first.key}"]`);
    target?.focus();
  }
}

/** Champs obligatoires laissés vides, vérifiés avant de passer à l'étape suivante. */
export function missingFields(fields: OnboardingField[], values: Record<string, string>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const field of fields) {
    if (field.required && !(values[field.key] ?? '').trim()) {
      errors[field.key] = ['Ce champ est obligatoire.'];
    }
  }

  return errors;
}
