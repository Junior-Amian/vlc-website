import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import Icon from '../components/ui/Icon';
import { buttonClass, inputClass } from '../components/ui/controls';
import { ITEM_STATUS } from '../dossiers/status';
import type { ItemStatus } from '../dossiers/types';

/*
  Briques propres à l'espace client. Les boutons, champs et messages sont
  ceux du panel (components/ui/controls.tsx) ; l'espace client y ajoute une
  mise en page plus aérée, pensée pour le téléphone d'abord.
*/

/**
 * Bouton principal d'un écran, en plus grand : 48 px de haut, texte en
 * 16 px. Dérivé du bouton du panel plutôt que surchargé, pour ne jamais
 * avoir deux hauteurs en conflit sur le même élément.
 */
export const bigButton = {
  primary: buttonClass.primary.replace('min-h-11', 'min-h-12').replace('text-sm', 'text-base'),
  secondary: buttonClass.secondary.replace('min-h-11', 'min-h-12').replace('text-sm', 'text-base'),
};

/** Bloc de contenu : fond blanc, coins larges, ombre à peine perceptible. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-surface-container bg-white p-5 shadow-ambient sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

/** Titre de page : un titre court et, dessous, ce que la page permet. */
export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">{title}</h1>
      {children && <p className="max-w-[60ch] text-sm leading-relaxed text-on-surface-variant sm:text-base">{children}</p>}
    </header>
  );
}

export function StatusChip({ status }: { status: ItemStatus }) {
  const meta = ITEM_STATUS[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.chip}`}
    >
      <Icon name={meta.icon} size={15} filled={status === 'validated'} />
      {meta.label}
    </span>
  );
}

/** Barre de progression fine, annoncée par son libellé. */
export function ProgressBar({ value, label, tone = 'secondary' }: { value: number; label: string; tone?: 'secondary' | 'green' }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-container"
    >
      <div
        className={`h-full origin-left rounded-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${tone === 'green' ? 'bg-brand-green' : 'bg-secondary'}`}
        style={{ transform: `scaleX(${percent / 100})` }}
      />
    </div>
  );
}

/** Champ de mot de passe avec un bouton pour afficher la saisie (utile au téléphone). */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputClass} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-on-surface-variant transition-colors hover:text-primary"
      >
        <Icon name={visible ? 'visibility_off' : 'visibility'} size={20} />
      </button>
    </div>
  );
}

/** Rayon du texte circulaire, dans le repère 120 × 120 du tampon. */
const STAMP_RADIUS = 47;

/**
 * L'étape en cours, frappée comme un tampon d'entrée : le motif consulaire
 * déjà validé par le client sur le site (section Collège Universel), ici
 * porteur d'une vraie information. Un seul tampon par écran.
 *
 * Le texte est donné aux lecteurs d'écran par `label` : le dessin, lui, est
 * décoratif.
 */
export function StepStamp({ step, total, className = '' }: { step: number; total: number; className?: string }) {
  const id = `stamp-ring${useId().replace(/:/g, '')}`;
  const r = STAMP_RADIUS;

  return (
    <div aria-hidden="true" className={`relative aspect-square -rotate-[8deg] text-brand-yellow ${className}`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <defs>
          <path id={id} d={`M 60,60 m -${r},0 a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 -${2 * r},0`} />
        </defs>
        <circle cx="60" cy="60" r="58" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="60" cy="60" r="54.5" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
        <text fill="currentColor" fontSize="7" fontWeight="700" letterSpacing="0.5">
          <textPath href={`#${id}`} textLength={Math.floor(2 * Math.PI * r)} lengthAdjust="spacing">
            VISILION · SUIVI DE DOSSIER · ÉTAPE EN COURS ·
          </textPath>
        </text>
      </svg>
      <p className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[2.35em] font-extrabold tracking-tight text-white">{step}</span>
        <span className="mt-1 text-[0.62em] font-bold uppercase tracking-[0.14em]">sur {total}</span>
      </p>
    </div>
  );
}
