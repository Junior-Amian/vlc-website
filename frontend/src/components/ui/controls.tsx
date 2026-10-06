import type { ReactNode } from 'react';
import Icon from './Icon';
import { brand, LOGO_ORDER } from './brand';

/*
  Briques d'interface des espaces de travail : le panel d'administration et
  l'espace client. Mêmes jetons que le site (marine, ocre, surfaces), sans
  les effets de la vitrine (apparitions, inclinaisons), inutiles dans un
  outil.

  Cibles de 44 px et champs en 16 px sur écran tactile : les deux espaces
  doivent rester confortables au téléphone, où se trouvent la plupart des
  clients.
*/

export const buttonClass = {
  primary:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-on-secondary-fixed disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]',
  secondary:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-container-high bg-white px-4 text-sm font-semibold text-primary transition-[background-color,border-color,transform] duration-150 hover:border-primary/30 hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]',
  danger:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-red/30 bg-white px-4 text-sm font-semibold text-brand-red-ink transition-colors hover:bg-brand-red-soft disabled:cursor-not-allowed disabled:opacity-60',
  // 44 px au doigt, 40 px à la souris.
  icon:
    'inline-flex h-11 w-11 pointer-fine:h-10 pointer-fine:w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary disabled:pointer-events-none disabled:opacity-30',
};

export const inputClass =
  'w-full rounded-xl border border-surface-container-high bg-white px-3.5 py-2.5 text-base text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/85 focus:border-primary focus:ring-2 focus:ring-primary/10 pointer-fine:text-sm aria-[invalid=true]:border-brand-red-ink';

/**
 * Signature du logo : ses quatre barres de couleur, dans le même ordre que
 * sur le logo et en pied de page du site.
 */
export function LogoBar({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`grid grid-cols-4 gap-0.5 ${className}`}>
      {LOGO_ORDER.map((color) => (
        <span key={color} className={`rounded-full ${brand[color].solid}`} />
      ))}
    </div>
  );
}

/** Pastille aux initiales d'une personne. */
export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-white ${className}`}
    >
      {initials || '?'}
    </span>
  );
}

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-on-surface-variant">
      <span className="inline-flex animate-spin">
        <Icon name="progress_activity" size={20} />
      </span>
      {label}
    </p>
  );
}

export function Notice({
  tone,
  children,
  onClose,
}: {
  tone: 'success' | 'error' | 'info';
  children: ReactNode;
  onClose?: () => void;
}) {
  const styles = {
    success: 'border-brand-green/30 bg-brand-green-soft text-brand-green',
    error: 'border-brand-red/30 bg-brand-red-soft text-brand-red-ink',
    info: 'border-brand-blue/20 bg-brand-blue-soft text-brand-blue',
  }[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${styles}`}
    >
      <Icon name={tone === 'success' ? 'check' : tone === 'error' ? 'error' : 'schedule'} size={20} className="mt-px shrink-0" />
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fermer le message" className="-m-1 rounded p-1 hover:bg-black/5">
          <Icon name="close" size={18} />
        </button>
      )}
    </div>
  );
}

/**
 * Libellé, aide, compteur et erreurs autour d'un champ. `htmlFor` relie le
 * libellé au contrôle ; les messages sont annoncés par aria-describedby.
 */
export function FieldShell({
  id,
  label,
  required,
  help,
  errors,
  counter,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  errors?: string[];
  counter?: { length: number; max: number };
  children: ReactNode;
}) {
  const over = counter && counter.length > counter.max;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-primary">
          {label}
          {!required && <span className="font-normal text-on-surface-variant"> (facultatif)</span>}
        </label>
        {counter && (
          <span
            className={`shrink-0 text-xs tabular-nums ${over ? 'font-bold text-brand-red-ink' : 'text-on-surface-variant'}`}
          >
            {counter.length} / {counter.max}
          </span>
        )}
      </div>

      {children}

      {help && (
        <p id={`${id}-help`} className="text-xs leading-relaxed text-on-surface-variant">
          {help}
        </p>
      )}

      {errors && errors.length > 0 && (
        <div id={`${id}-error`} className="flex flex-col gap-1">
          {errors.map((error) => (
            <p key={error} className="flex items-start gap-1.5 text-sm font-medium text-brand-red-ink">
              <Icon name="error" size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function describedBy(id: string, help?: string, errors?: string[]): string | undefined {
  const ids = [help ? `${id}-help` : null, errors?.length ? `${id}-error` : null].filter(Boolean);

  return ids.length > 0 ? ids.join(' ') : undefined;
}

/** Icône de chargement à placer dans un bouton pendant une action. */
export function ButtonSpinner() {
  return (
    <span className="inline-flex animate-spin">
      <Icon name="progress_activity" size={18} />
    </span>
  );
}
