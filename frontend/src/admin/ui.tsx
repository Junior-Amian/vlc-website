import type { ReactNode } from 'react';

/*
  Briques propres au panel. Les briques communes avec l'espace client
  (boutons, champs, messages) vivent dans components/ui/controls.tsx et sont
  reprises ici, pour que les pages du panel les importent toutes d'un seul
  endroit.
*/
export {
  Avatar,
  ButtonSpinner,
  buttonClass,
  describedBy,
  FieldShell,
  inputClass,
  LogoBar,
  Notice,
  Spinner,
} from '../components/ui/controls';

/**
 * En-tête de chaque page du panel : où l'on est (`trail`), le titre, ce que
 * la page permet de faire, et ses actions à droite.
 */
export function PageHeader({
  trail,
  title,
  description,
  actions,
}: {
  trail?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-surface-container pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {trail && <p className="text-sm font-medium text-on-surface-variant">{trail}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-[1.75rem]">{title}</h1>
        {description && (
          <p className="max-w-[62ch] text-sm leading-relaxed text-on-surface-variant">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Bloc de contenu : un titre, un sous-titre facultatif, et son contenu. */
export function Panel({
  title,
  subtitle,
  aside,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col gap-5 rounded-2xl border border-surface-container bg-white p-5 sm:p-6 ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-primary">{title}</h2>
            {subtitle && <p className="text-sm leading-relaxed text-on-surface-variant">{subtitle}</p>}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
